import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe Webhook。checkout.session.completed で決済を確定し、
 * payment_group / payments / participants を支払済にする。
 * Stripe ダッシュボードで本エンドポイント（/api/stripe/webhook）を登録し、
 * 署名シークレットを STRIPE_WEBHOOK_SECRET に設定すること。
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook secret 未設定" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `署名検証失敗: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_intent: string | null;
      metadata?: { payment_group_id?: string };
    };
    const groupId = session.metadata?.payment_group_id;
    if (!groupId) return NextResponse.json({ received: true });

    // 冪等性：既に completed のグループは再処理しない。
    // Stripe は配信失敗時にリトライし、同一イベントを重複配信することがある。
    // 早期 return で重複時の無駄な更新・Stripe API 再取得（負荷）を避ける。
    const { data: grp, error: grpErr } = await admin
      .from("payment_groups")
      .select("status")
      .eq("id", groupId)
      .single();
    if (grpErr) {
      // 一時障害の可能性。500 を返して Stripe にリトライさせる。
      return NextResponse.json({ error: "group 取得失敗" }, { status: 500 });
    }
    if ((grp as unknown as { status: string } | null)?.status === "completed") {
      return NextResponse.json({ received: true, skipped: "already completed" });
    }

    // 実際に使われた支払い方法を PaymentIntent の charge から判定（types[0] は提示順で不正確）。
    let method: "paypay" | "credit_card" = "credit_card";
    if (session.payment_intent) {
      try {
        const pi = (await getStripe().paymentIntents.retrieve(session.payment_intent, {
          expand: ["latest_charge"],
        })) as unknown as {
          latest_charge?: { payment_method_details?: { type?: string } } | null;
        };
        if (pi.latest_charge?.payment_method_details?.type === "paypay") method = "paypay";
      } catch {
        // 取得失敗時は credit_card のまま（記録用の補助情報のため致命的でない）。
      }
    }
    const paidAt = new Date().toISOString();

    // 各更新はエラーを検査し、失敗時は 500 を返して Stripe にリトライさせる。
    // 更新はいずれも冪等（同じ status へ複数回更新しても結果は同じ）なので再実行で整合する。
    // payment_group 更新
    const upGroup = await admin
      .from("payment_groups")
      .update({
        status: "completed",
        method,
        paid_at: paidAt,
        stripe_payment_intent_id: session.payment_intent,
      } as never)
      .eq("id", groupId);
    if (upGroup.error) {
      return NextResponse.json({ error: "payment_group 更新失敗" }, { status: 500 });
    }

    // payments（按分）→ completed、participants → paid
    const { data: pays, error: paysErr } = await admin
      .from("payments")
      .select("participant_id")
      .eq("payment_group_id", groupId);
    if (paysErr) {
      return NextResponse.json({ error: "payments 取得失敗" }, { status: 500 });
    }
    const partIds = ((pays ?? []) as unknown as { participant_id: string }[]).map(
      (p) => p.participant_id,
    );

    const upPays = await admin
      .from("payments")
      .update({ status: "completed" } as never)
      .eq("payment_group_id", groupId);
    if (upPays.error) {
      return NextResponse.json({ error: "payments 更新失敗" }, { status: 500 });
    }

    if (partIds.length) {
      const upParts = await admin
        .from("participants")
        .update({ status: "paid" } as never)
        .in("id", partIds);
      if (upParts.error) {
        return NextResponse.json({ error: "participants 更新失敗" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
