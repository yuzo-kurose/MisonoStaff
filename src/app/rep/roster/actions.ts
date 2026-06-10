"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { yen } from "@/lib/format";

/** 確定者へ決済依頼メールを送信し、通知ログを残す（ベストエフォート）。 */
async function sendPaymentRequests(applicationId: string) {
  const admin = createAdminClient();
  const { data: parts } = await admin
    .from("participants")
    .select("id,user_id,total_amount")
    .eq("application_id", applicationId)
    .eq("status", "confirmed");
  const participants = (parts ?? []) as unknown as {
    id: string;
    user_id: string;
    total_amount: number;
  }[];
  if (participants.length === 0) return;

  const { data: appData } = await admin
    .from("applications")
    .select("event_id")
    .eq("id", applicationId)
    .single();
  const eventId = (appData as unknown as { event_id: string } | null)?.event_id;
  const { data: ev } = await admin
    .from("events")
    .select("name")
    .eq("id", eventId ?? "")
    .single();
  const eventName = (ev as { name: string } | null)?.name ?? "イベント";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const p of participants) {
    const { data: u } = await admin.auth.admin.getUserById(p.user_id);
    const email = u.user?.email;
    if (!email) continue;
    const html = `
      <p>神苑スタッフの参加申込が確定しました。下記より事前決済をお願いします。</p>
      <p><strong>${eventName}</strong><br>参加費：${yen(p.total_amount)}</p>
      <p><a href="${appUrl}/payment">▶ お支払いに進む</a></p>
      <p>※ ログイン後、確定分をまとめて決済できます。</p>`;
    const res = await sendEmail({
      to: email,
      subject: `【神苑スタッフ】${eventName} 参加費お支払いのお願い`,
      html,
    });
    await admin.from("notification_logs").insert({
      user_id: p.user_id,
      participant_id: p.id,
      type: "payment_request",
      channel: "email",
      destination: email,
      status: res.sent ? "sent" : "failed",
      sent_at: res.sent ? new Date().toISOString() : null,
    } as never);
  }
}

/**
 * 名簿確定：application 内の applying な participant を confirmed に、
 * application を confirmed に。RLS により代表者（自拠点）/管理者のみ成功。
 */
export async function confirmApplication(
  applicationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const { error: pErr } = await supabase
    .from("participants")
    .update({ status: "confirmed" } as never)
    .eq("application_id", applicationId)
    .eq("status", "applying");
  if (pErr) return { ok: false, error: pErr.message };

  const { error: aErr } = await supabase
    .from("applications")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirmed_by_user_id: user.id,
    } as never)
    .eq("id", applicationId);
  if (aErr) return { ok: false, error: aErr.message };

  // 確定者へ決済依頼メール（ベストエフォート）
  await sendPaymentRequests(applicationId);

  revalidatePath("/rep/roster");
  revalidatePath("/rep/payments");
  return { ok: true };
}

/** 名簿から外す（個人をキャンセル扱い）。決済前のキャンセルは名簿除外で完結。 */
export async function removeParticipant(
  participantId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("participants")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as never)
    .eq("id", participantId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rep/roster");
  return { ok: true };
}
