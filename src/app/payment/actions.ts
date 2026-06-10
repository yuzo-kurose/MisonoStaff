"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/**
 * 確定済み・未決済の参加（複数イベント）をまとめて1回の Stripe Checkout にする。
 * payment_group（取引）＋ payments（イベント按分）を作成し、Checkout URL を返す。
 */
export async function createCheckout(): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const admin = createAdminClient();

  // 確定済み・未決済の participant を取得
  const { data: partData } = await admin
    .from("participants")
    .select("id,application_id,total_amount,status")
    .eq("user_id", user.id)
    .eq("status", "confirmed");
  const participants = (partData ?? []) as unknown as {
    id: string;
    application_id: string;
    total_amount: number;
  }[];
  if (participants.length === 0) return { error: "決済対象（確定済み・未決済）がありません。" };

  // イベント名を解決
  const { data: appData } = await admin
    .from("applications")
    .select("id,event_id")
    .in("id", [...new Set(participants.map((p) => p.application_id))]);
  const apps = (appData ?? []) as unknown as { id: string; event_id: string }[];
  const { data: evData } = await admin
    .from("events")
    .select("id,name")
    .in("id", [...new Set(apps.map((a) => a.event_id))]);
  const events = (evData ?? []) as unknown as { id: string; name: string }[];
  const eventNameOf = (participantApp: string) => {
    const ev = apps.find((a) => a.id === participantApp);
    return events.find((e) => e.id === ev?.event_id)?.name ?? "イベント参加費";
  };

  const total = participants.reduce((s, p) => s + p.total_amount, 0);

  // 古い未完了の payments を掃除（再試行時の unique 衝突回避）
  await admin
    .from("payments")
    .delete()
    .in(
      "participant_id",
      participants.map((p) => p.id),
    )
    .neq("status", "completed");

  // payment_group 作成
  const { data: groupData, error: gErr } = await admin
    .from("payment_groups")
    .insert({ user_id: user.id, total_amount: total, status: "requested" } as never)
    .select("id")
    .single();
  if (gErr) return { error: gErr.message };
  const groupId = (groupData as { id: string }).id;

  // payments（按分）作成
  for (const p of participants) {
    const { error } = await admin.from("payments").insert({
      payment_group_id: groupId,
      participant_id: p.id,
      amount: p.total_amount,
      status: "requested",
    } as never);
    if (error) return { error: error.message };
  }

  // Stripe Checkout Session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let session;
  try {
    const stripe = getStripe();
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"], // PayPay 有効化後に "paypay" を追加
      line_items: participants.map((p) => ({
        quantity: 1,
        price_data: {
          currency: "jpy",
          product_data: { name: eventNameOf(p.application_id) },
          unit_amount: p.total_amount,
        },
      })),
      success_url: `${appUrl}/mypage?paid=1`,
      cancel_url: `${appUrl}/payment`,
      metadata: { payment_group_id: groupId },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "決済の開始に失敗しました。" };
  }

  await admin
    .from("payment_groups")
    .update({
      stripe_checkout_session_id: session.id,
      checkout_url: session.url,
    } as never)
    .eq("id", groupId);

  return { url: session.url ?? undefined };
}
