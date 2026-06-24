"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ParticipantStatus } from "@/types/database";

export type ApplyValue = {
  fieldId: string;
  value: string | null; // text/textarea/number/date
  optionIds: string[]; // select_single/select_multiple
};
export type ApplyInput = {
  branchId: string; // 申込時に選択する所属拠点
  division?: string; // 申込時に選択する部（本人プロフィールに反映）
  events: { eventId: string; values: ApplyValue[] }[];
};

type FieldDef = {
  id: string;
  form_id: string;
  field_type: string;
  price_calc_type: "none" | "per_unit" | "option_based";
  unit_price: number | null;
};
type OptDef = { id: string; form_field_id: string; price: number | null };

/**
 * 申込を作成。
 * - 認証ユーザー本人の participant のみ作成（user_id は session から取得）
 * - 拠点単位の applications を find-or-create（RLS回避のため service_role で実行）
 * - 金額は DB のフォーム定義から再計算（クライアント値は信用しない）
 */
export async function submitApplication(
  input: ApplyInput,
): Promise<{ ok: boolean; created?: number; updated?: number; skipped?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  // 所属拠点（申込時に選択。実在する拠点かを service_role で検証する）
  const branchId = input.branchId;
  if (!branchId) return { ok: false, error: "所属（拠点）を選択してください。" };

  const admin = createAdminClient();
  const { data: branchRow } = await admin
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .maybeSingle();
  if (!branchRow) return { ok: false, error: "選択した所属（拠点）が不正です。" };

  // 申込者情報の所属・部を本人プロフィールに反映（RLSで自分の行のみ更新）。
  const validDivisions = ["student", "university", "adult", "mens", "general"];
  const profilePatch: Record<string, string> = { branch_id: branchId };
  if (input.division && validDivisions.includes(input.division)) profilePatch.division = input.division;
  await supabase.from("profiles").update(profilePatch as never).eq("id", user.id);

  const eventIds = input.events.map((e) => e.eventId);
  if (eventIds.length === 0) return { ok: false, error: "イベントが選択されていません。" };

  // 対象イベント（公開中のみ）と form_id
  const { data: evs } = await admin
    .from("events")
    .select("id,form_id,status")
    .in("id", eventIds);
  const events = (evs ?? []) as unknown as {
    id: string;
    form_id: string;
    status: string;
  }[];

  const formIds = [...new Set(events.map((e) => e.form_id))];
  const { data: fieldsData } = await admin
    .from("form_fields")
    .select("id,form_id,field_type,price_calc_type,unit_price")
    .in("form_id", formIds);
  const fields = (fieldsData ?? []) as unknown as FieldDef[];

  const fieldIds = fields.map((f) => f.id);
  let options: OptDef[] = [];
  if (fieldIds.length) {
    const { data: optData } = await admin
      .from("form_field_options")
      .select("id,form_field_id,price")
      .in("form_field_id", fieldIds);
    options = (optData ?? []) as unknown as OptDef[];
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const ev of input.events) {
    const event = events.find((e) => e.id === ev.eventId);
    if (!event || event.status !== "published") {
      skipped++;
      continue;
    }

    // 金額計算
    let total = 0;
    for (const v of ev.values) {
      const f = fields.find((x) => x.id === v.fieldId);
      if (!f) continue;
      if (f.price_calc_type === "per_unit") {
        total += (Number(v.value) || 0) * (f.unit_price ?? 0);
      } else if (f.price_calc_type === "option_based") {
        for (const oid of v.optionIds) {
          total += options.find((o) => o.id === oid)?.price ?? 0;
        }
      }
    }

    // application を find-or-create（拠点単位）
    const { data: appFound } = await admin
      .from("applications")
      .select("id")
      .eq("event_id", ev.eventId)
      .eq("branch_id", branchId)
      .maybeSingle();
    let applicationId = (appFound as { id: string } | null)?.id;
    if (!applicationId) {
      const { data: appNew, error: appErr } = await admin
        .from("applications")
        .insert({ event_id: ev.eventId, branch_id: branchId, status: "open" } as never)
        .select("id")
        .single();
      if (appErr) return { ok: false, error: appErr.message };
      applicationId = (appNew as { id: string }).id;
    }

    // 入力値を書き込む（既存値は入れ替え。options は participant_values の cascade で消える）。
    const writeValues = async (participantId: string) => {
      await admin.from("participant_values").delete().eq("participant_id", participantId);
      for (const v of ev.values) {
        const { data: pvNew, error: pvErr } = await admin
          .from("participant_values")
          .insert({
            participant_id: participantId,
            form_field_id: v.fieldId,
            value: v.value,
          } as never)
          .select("id")
          .single();
        if (pvErr) throw new Error(pvErr.message);
        if (v.optionIds.length) {
          const pvId = (pvNew as { id: string }).id;
          const { error: pvoErr } = await admin
            .from("participant_value_options")
            .insert(
              v.optionIds.map((oid) => ({
                participant_value_id: pvId,
                form_field_option_id: oid,
              })) as never,
            );
          if (pvoErr) throw new Error(pvoErr.message);
        }
      }
    };

    // 既存の申込（同 application × 本人）
    const { data: existing } = await admin
      .from("participants")
      .select("id,status")
      .eq("application_id", applicationId)
      .eq("user_id", user.id)
      .maybeSingle();
    const ex = existing as { id: string; status: string } | null;

    try {
      if (ex) {
        // 申込中のみ内容を更新できる。確定済み等は依頼経由なのでスキップ。
        if (ex.status !== "applying") {
          skipped++;
          continue;
        }
        const { error: uErr } = await admin
          .from("participants")
          .update({ total_amount: total } as never)
          .eq("id", ex.id);
        if (uErr) return { ok: false, error: uErr.message };
        await writeValues(ex.id);
        updated++;
      } else {
        const { data: partNew, error: partErr } = await admin
          .from("participants")
          .insert({
            application_id: applicationId,
            user_id: user.id,
            status: "applying",
            total_amount: total,
            entered_via: "self",
          } as never)
          .select("id")
          .single();
        if (partErr) return { ok: false, error: partErr.message };
        await writeValues((partNew as { id: string }).id);
        created++;
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました。" };
    }
  }

  return { ok: true, created, updated, skipped };
}

export type ExistingApplication = {
  participantId: string;
  status: ParticipantStatus;
  branchId: string;
  values: Record<string, { value: string | null; optionIds: string[] }>;
};

/**
 * 申込ページ用：本人の既存申込（イベントID→情報）。
 * 申込中なら内容を表示・編集、確定済みなら代表者への依頼に切り替えるための判定に使う。
 */
export async function getMyExistingApplications(
  eventIds: string[],
): Promise<Record<string, ExistingApplication>> {
  if (eventIds.length === 0) return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const admin = createAdminClient();

  const { data: parts } = await admin
    .from("participants")
    .select("id,application_id,status")
    .eq("user_id", user.id)
    .neq("status", "cancelled");
  const participants = (parts ?? []) as unknown as {
    id: string;
    application_id: string;
    status: ParticipantStatus;
  }[];
  if (participants.length === 0) return {};

  const { data: apps } = await admin
    .from("applications")
    .select("id,event_id,branch_id")
    .in("id", participants.map((p) => p.application_id));
  const appList = (apps ?? []) as unknown as { id: string; event_id: string; branch_id: string }[];

  const result: Record<string, ExistingApplication> = {};
  const eventByPart = new Map<string, string>();
  for (const p of participants) {
    const app = appList.find((a) => a.id === p.application_id);
    if (!app || !eventIds.includes(app.event_id)) continue;
    // 同イベントに複数あれば最初の1件（通常1件）。
    if (result[app.event_id]) continue;
    result[app.event_id] = { participantId: p.id, status: p.status, branchId: app.branch_id, values: {} };
    eventByPart.set(p.id, app.event_id);
  }
  const partIds = [...eventByPart.keys()];
  if (partIds.length === 0) return {};

  const { data: pvs } = await admin
    .from("participant_values")
    .select("id,participant_id,form_field_id,value")
    .in("participant_id", partIds);
  const pvList = (pvs ?? []) as unknown as {
    id: string;
    participant_id: string;
    form_field_id: string;
    value: string | null;
  }[];
  let pvoList: { participant_value_id: string; form_field_option_id: string }[] = [];
  if (pvList.length) {
    const { data: pvos } = await admin
      .from("participant_value_options")
      .select("participant_value_id,form_field_option_id")
      .in("participant_value_id", pvList.map((v) => v.id));
    pvoList = (pvos ?? []) as typeof pvoList;
  }

  for (const v of pvList) {
    const eid = eventByPart.get(v.participant_id);
    if (!eid) continue;
    const optionIds = pvoList
      .filter((o) => o.participant_value_id === v.id)
      .map((o) => o.form_field_option_id);
    result[eid].values[v.form_field_id] = { value: v.value, optionIds };
  }
  return result;
}

/** 確定済み申込について代表者へ「編集依頼／キャンセル依頼」を出す（本人のみ・RLS）。 */
export async function requestChange(
  participantId: string,
  type: "edit" | "cancel",
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };
  const { error } = await supabase
    .from("change_requests")
    .insert({
      participant_id: participantId,
      type,
      message: message || null,
      requested_by: user.id,
    } as never);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
