"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guard";
import { getStripe } from "@/lib/stripe";

/**
 * 返金（イベント単位）。
 * ポリシー：開催当日は返金不可／前日まで全額。
 * Stripe の PaymentIntent に対し部分返金 → refunds 記録 → payment/participant を更新。
 */
export async function refundParticipant(
  participantId: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  // 返金は service_role で RLS を迂回するため、ここで管理者ロールを必ず検証する。
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();

  // participant → application → event 日付（ポリシー判定）
  const { data: partRow } = await admin
    .from("participants")
    .select("id,application_id,status")
    .eq("id", participantId)
    .single();
  const participant = partRow as { id: string; application_id: string; status: string } | null;
  if (!participant) return { ok: false, error: "参加者が見つかりません。" };
  if (participant.status !== "paid")
    return { ok: false, error: "支払済の申込のみ返金できます。" };

  const { data: appRow } = await admin
    .from("applications")
    .select("event_id")
    .eq("id", participant.application_id)
    .single();
  const eventId = (appRow as { event_id: string } | null)?.event_id;
  const { data: evRow } = await admin
    .from("events")
    .select("event_date")
    .eq("id", eventId!)
    .single();
  const eventDate = (evRow as { event_date: string } | null)?.event_date ?? "";
  const today = new Date().toISOString().slice(0, 10);
  if (eventDate <= today)
    return { ok: false, error: "開催当日以降は返金できません（前日まで全額返金）。" };

  // payment（按分）＋ group の PaymentIntent
  const { data: payRow } = await admin
    .from("payments")
    .select("id,amount,payment_group_id,status")
    .eq("participant_id", participantId)
    .single();
  const payment = payRow as
    | { id: string; amount: number; payment_group_id: string; status: string }
    | null;
  if (!payment) return { ok: false, error: "決済記録が見つかりません。" };

  const { data: grpRow } = await admin
    .from("payment_groups")
    .select("stripe_payment_intent_id")
    .eq("id", payment.payment_group_id)
    .single();
  const intentId = (grpRow as { stripe_payment_intent_id: string | null } | null)
    ?.stripe_payment_intent_id;
  if (!intentId)
    return { ok: false, error: "Stripeの決済情報がありません（テスト/手動データ）。" };

  // Stripe 部分返金
  let refundId: string;
  try {
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: intentId,
      amount: payment.amount,
    });
    refundId = refund.id;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe返金に失敗しました。" };
  }

  // 記録・状態更新
  await admin.from("refunds").insert({
    payment_id: payment.id,
    amount: payment.amount,
    reason: reason ?? null,
    refunded_by_user_id: auth.userId,
    stripe_refund_id: refundId,
  } as never);
  await admin
    .from("payments")
    .update({ status: "refunded", refunded_amount: payment.amount } as never)
    .eq("id", payment.id);
  await admin
    .from("participants")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as never)
    .eq("id", participantId);

  revalidatePath("/admin/applications");
  return { ok: true };
}
