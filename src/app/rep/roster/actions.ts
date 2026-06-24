"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guard";
import { sendEmail } from "@/lib/email";
import { yen } from "@/lib/format";
import type { FieldType } from "@/types/database";

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

/** 1名分の決済依頼メールを送る（人単位の確定で使用）。 */
async function sendPaymentRequestForParticipant(participantId: string) {
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("participants")
    .select("id,user_id,total_amount,application_id")
    .eq("id", participantId)
    .single();
  const part = p as unknown as {
    id: string;
    user_id: string;
    total_amount: number;
    application_id: string;
  } | null;
  if (!part) return;

  const { data: appData } = await admin
    .from("applications")
    .select("event_id")
    .eq("id", part.application_id)
    .single();
  const eventId = (appData as { event_id: string } | null)?.event_id;
  const { data: ev } = await admin.from("events").select("name").eq("id", eventId ?? "").single();
  const eventName = (ev as { name: string } | null)?.name ?? "イベント";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data: u } = await admin.auth.admin.getUserById(part.user_id);
  const email = u.user?.email;
  if (!email) return;
  const html = `
    <p>神苑スタッフの参加申込が確定しました。下記より事前決済をお願いします。</p>
    <p><strong>${eventName}</strong><br>参加費：${yen(part.total_amount)}</p>
    <p><a href="${appUrl}/payment">▶ お支払いに進む</a></p>
    <p>※ ログイン後、確定分をまとめて決済できます。</p>`;
  const res = await sendEmail({
    to: email,
    subject: `【神苑スタッフ】${eventName} 参加費お支払いのお願い`,
    html,
  });
  await admin.from("notification_logs").insert({
    user_id: part.user_id,
    participant_id: part.id,
    type: "payment_request",
    channel: "email",
    destination: email,
    status: res.sent ? "sent" : "failed",
    sent_at: res.sent ? new Date().toISOString() : null,
  } as never);
}

/**
 * 人単位の確定：1名の participant を applying→confirmed にする。
 * RLS により代表者（自拠点）/管理者のみ成功。確定者へ決済依頼メールを送る。
 */
export async function confirmParticipant(
  participantId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const { data: updated, error } = await supabase
    .from("participants")
    .update({ status: "confirmed" } as never)
    .eq("id", participantId)
    .eq("status", "applying")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "確定できる申込ではありません（既に確定/決済済みの可能性）。" };

  await sendPaymentRequestForParticipant(participantId);

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

/** 参加者の未対応の変更依頼（編集/キャンセル）を対応済みにする。代表者(自拠点)・管理者のみ（RLS）。 */
export async function resolveChangeRequest(
  participantId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("change_requests")
    .update({ status: "done", resolved_at: new Date().toISOString() } as never)
    .eq("participant_id", participantId)
    .eq("status", "open");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rep/roster");
  return { ok: true };
}

// ============================================================
// 申込内容の編集（代表者・管理者が代わりに修正する）
// ============================================================

export type EditField = {
  id: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  priceCalc: "none" | "per_unit" | "option_based";
  unitPrice: number | null;
  options: { id: string; label: string; price: number | null }[];
};
export type EditValue = { fieldId: string; value: string | null; optionIds: string[] };
export type ParticipantEdit = {
  participantId: string;
  name: string;
  eventId: string;
  eventName: string;
  status: string;
  fields: EditField[];
  values: Record<string, { value: string | null; optionIds: string[] }>;
};

/** 呼び出し元（代表者/管理者）が、その participant の申込を編集できるか検証する。 */
async function assertCanEditParticipant(participantId: string) {
  const auth = await requireRole(["admin", "representative"]);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("participants")
    .select("id,application_id,status,user_id,total_amount")
    .eq("id", participantId)
    .maybeSingle();
  const part = p as unknown as {
    id: string;
    application_id: string;
    status: string;
    user_id: string;
    total_amount: number;
  } | null;
  if (!part) return { ok: false as const, error: "申込が見つかりません。" };

  const { data: app } = await admin
    .from("applications")
    .select("id,event_id,branch_id")
    .eq("id", part.application_id)
    .single();
  const application = app as unknown as { id: string; event_id: string; branch_id: string };

  if (auth.role !== "admin") {
    // 代表者：自分が代表を務める拠点の申込のみ編集可。
    const { data: own } = await admin
      .from("branches")
      .select("id")
      .eq("id", application.branch_id)
      .eq("representative_user_id", auth.userId)
      .maybeSingle();
    if (!own) return { ok: false as const, error: "自拠点の申込のみ編集できます。" };
  }
  return { ok: true as const, admin, part, application };
}

/** 編集画面用：participant の申込内容（フォーム項目＋現在の回答）を取得する。 */
export async function getParticipantForEdit(participantId: string): Promise<ParticipantEdit | null> {
  const check = await assertCanEditParticipant(participantId);
  if (!check.ok) return null;
  const { admin, part, application } = check;

  const [{ data: prof }, { data: ev }] = await Promise.all([
    admin.from("profiles").select("name").eq("id", part.user_id).single(),
    admin.from("events").select("name,form_id").eq("id", application.event_id).single(),
  ]);
  const event = ev as unknown as { name: string; form_id: string };

  const { data: fd } = await admin
    .from("form_fields")
    .select("id,label,field_type,is_required,sort_order,price_calc_type,unit_price")
    .eq("form_id", event.form_id)
    .order("sort_order", { ascending: true });
  const fdRows = (fd ?? []) as unknown as {
    id: string;
    label: string;
    field_type: FieldType;
    is_required: boolean;
    price_calc_type: "none" | "per_unit" | "option_based";
    unit_price: number | null;
  }[];
  const { data: od } = fdRows.length
    ? await admin
        .from("form_field_options")
        .select("id,form_field_id,label,price,sort_order")
        .in("form_field_id", fdRows.map((f) => f.id))
        .order("sort_order", { ascending: true })
    : { data: [] };
  const optRows = (od ?? []) as unknown as {
    id: string;
    form_field_id: string;
    label: string;
    price: number | null;
  }[];

  const fields: EditField[] = fdRows.map((f) => ({
    id: f.id,
    label: f.label,
    fieldType: f.field_type,
    required: f.is_required,
    priceCalc: f.price_calc_type,
    unitPrice: f.unit_price,
    options: optRows
      .filter((o) => o.form_field_id === f.id)
      .map((o) => ({ id: o.id, label: o.label, price: o.price })),
  }));

  // 現在の回答
  const { data: pvs } = await admin
    .from("participant_values")
    .select("id,form_field_id,value")
    .eq("participant_id", participantId);
  const pvRows = (pvs ?? []) as unknown as {
    id: string;
    form_field_id: string;
    value: string | null;
  }[];
  const pvIds = pvRows.map((v) => v.id);
  const { data: pvo } = pvIds.length
    ? await admin
        .from("participant_value_options")
        .select("participant_value_id,form_field_option_id")
        .in("participant_value_id", pvIds)
    : { data: [] };
  const pvoRows = (pvo ?? []) as unknown as {
    participant_value_id: string;
    form_field_option_id: string;
  }[];
  const values: Record<string, { value: string | null; optionIds: string[] }> = {};
  for (const v of pvRows) {
    values[v.form_field_id] = {
      value: v.value,
      optionIds: pvoRows.filter((o) => o.participant_value_id === v.id).map((o) => o.form_field_option_id),
    };
  }

  return {
    participantId,
    name: (prof as { name: string } | null)?.name ?? "（不明）",
    eventId: application.event_id,
    eventName: event.name,
    status: part.status,
    fields,
    values,
  };
}

/** 申込内容（フォーム回答・金額）を保存する。代表者(自拠点)/管理者のみ。決済済みは不可。 */
export async function updateParticipantValues(
  participantId: string,
  inputValues: EditValue[],
): Promise<{ ok: boolean; error?: string }> {
  const check = await assertCanEditParticipant(participantId);
  if (!check.ok) return { ok: false, error: check.error };
  const { admin, part, application } = check;
  if (part.status === "paid")
    return { ok: false, error: "決済済みの申込は編集できません（返金してから再申込してください）。" };
  if (part.status === "cancelled") return { ok: false, error: "取消済みの申込は編集できません。" };

  // このイベントのフォーム項目定義（金額再計算用）
  const { data: ev } = await admin.from("events").select("form_id").eq("id", application.event_id).single();
  const formId = (ev as unknown as { form_id: string }).form_id;
  const { data: fd } = await admin
    .from("form_fields")
    .select("id,price_calc_type,unit_price")
    .eq("form_id", formId);
  const fieldDefs = (fd ?? []) as unknown as {
    id: string;
    price_calc_type: string;
    unit_price: number | null;
  }[];
  const validFieldIds = new Set(fieldDefs.map((f) => f.id));
  const values = inputValues.filter((v) => validFieldIds.has(v.fieldId));
  const optionIds = values.flatMap((v) => v.optionIds);
  let optDefs: { id: string; price: number | null }[] = [];
  if (optionIds.length) {
    const { data: od } = await admin.from("form_field_options").select("id,price").in("id", optionIds);
    optDefs = (od ?? []) as unknown as typeof optDefs;
  }

  // 金額再計算（DB定義から）
  let total = 0;
  for (const v of values) {
    const f = fieldDefs.find((x) => x.id === v.fieldId);
    if (!f) continue;
    if (f.price_calc_type === "per_unit") total += (Number(v.value) || 0) * (f.unit_price ?? 0);
    else if (f.price_calc_type === "option_based")
      for (const oid of v.optionIds) total += optDefs.find((o) => o.id === oid)?.price ?? 0;
  }

  // 回答を入れ替え
  const { error: delErr } = await admin
    .from("participant_values")
    .delete()
    .eq("participant_id", participantId);
  if (delErr) return { ok: false, error: delErr.message };
  for (const v of values) {
    if (!v.value && v.optionIds.length === 0) continue;
    const { data: pvNew, error: pvErr } = await admin
      .from("participant_values")
      .insert({ participant_id: participantId, form_field_id: v.fieldId, value: v.value } as never)
      .select("id")
      .single();
    if (pvErr) return { ok: false, error: pvErr.message };
    if (v.optionIds.length) {
      const pvId = (pvNew as { id: string }).id;
      const { error: pvoErr } = await admin.from("participant_value_options").insert(
        v.optionIds.map((oid) => ({ participant_value_id: pvId, form_field_option_id: oid })) as never,
      );
      if (pvoErr) return { ok: false, error: pvoErr.message };
    }
  }

  const { error: upErr } = await admin
    .from("participants")
    .update({ total_amount: total } as never)
    .eq("id", participantId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/rep/roster");
  return { ok: true };
}
