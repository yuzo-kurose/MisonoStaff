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
      payment_method_types?: string[];
      metadata?: { payment_group_id?: string };
    };
    const groupId = session.metadata?.payment_group_id;
    if (!groupId) return NextResponse.json({ received: true });

    const method =
      session.payment_method_types?.[0] === "paypay" ? "paypay" : "credit_card";
    const paidAt = new Date().toISOString();

    // payment_group 更新
    await admin
      .from("payment_groups")
      .update({
        status: "completed",
        method,
        paid_at: paidAt,
        stripe_payment_intent_id: session.payment_intent,
      } as never)
      .eq("id", groupId);

    // payments（按分）→ completed、participants → paid
    const { data: pays } = await admin
      .from("payments")
      .select("participant_id")
      .eq("payment_group_id", groupId);
    const partIds = ((pays ?? []) as unknown as { participant_id: string }[]).map(
      (p) => p.participant_id,
    );

    await admin
      .from("payments")
      .update({ status: "completed" } as never)
      .eq("payment_group_id", groupId);

    if (partIds.length) {
      await admin
        .from("participants")
        .update({ status: "paid" } as never)
        .in("id", partIds);
    }
  }

  return NextResponse.json({ received: true });
}
