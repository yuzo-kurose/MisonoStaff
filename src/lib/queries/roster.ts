import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { ParticipantStatus } from "@/types/database";

export type RosterMember = {
  participantId: string;
  name: string;
  status: ParticipantStatus;
  amount: number;
  request?: { type: "edit" | "cancel"; message: string | null } | null;
  values: Record<string, string>; // フォーム項目ID → 回答の表示文字列
};
export type RosterField = { id: string; label: string };
export type RosterGroup = {
  applicationId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  branchName: string;
  applicationStatus: "open" | "confirmed";
  fields: RosterField[]; // このイベントの申込フォーム項目（列見出し）
  members: RosterMember[];
};

/**
 * 名簿（application＝イベント×拠点 単位）。
 * - 代表者：自分が代表の拠点のみ
 * - 管理者：全拠点
 */
export async function getRoster(): Promise<RosterGroup[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role: string } | null)?.role;
  const isAdmin = role === "admin";

  // 対象の applications
  let appsQuery = supabase.from("applications").select("id,event_id,branch_id,status");
  if (!isAdmin) {
    const { data: repBranches } = await supabase
      .from("branches")
      .select("id")
      .eq("representative_user_id", user.id);
    const branchIds = ((repBranches ?? []) as unknown as { id: string }[]).map((b) => b.id);
    if (branchIds.length === 0) return [];
    appsQuery = appsQuery.in("branch_id", branchIds);
  }
  const { data: appsData } = await appsQuery;
  const apps = (appsData ?? []) as unknown as {
    id: string;
    event_id: string;
    branch_id: string;
    status: "open" | "confirmed";
  }[];
  if (apps.length === 0) return [];

  const { data: partData } = await supabase
    .from("participants")
    .select("id,application_id,user_id,status,total_amount")
    .in(
      "application_id",
      apps.map((a) => a.id),
    )
    .neq("status", "cancelled");
  const participants = (partData ?? []) as unknown as {
    id: string;
    application_id: string;
    user_id: string;
    status: ParticipantStatus;
    total_amount: number;
  }[];

  const [{ data: profs }, { data: evs }, { data: brs }] = await Promise.all([
    supabase.from("profiles").select("id,name").in("id", [...new Set(participants.map((p) => p.user_id))]),
    // 論理削除済みイベントは名簿に出さない。
    supabase
      .from("events")
      .select("id,name,event_date,form_id")
      .in("id", [...new Set(apps.map((a) => a.event_id))])
      .is("deleted_at", null),
    supabase.from("branches").select("id,name").in("id", [...new Set(apps.map((a) => a.branch_id))]),
  ]);
  const names = (profs ?? []) as unknown as { id: string; name: string }[];
  const events = (evs ?? []) as unknown as { id: string; name: string; event_date: string; form_id: string }[];
  const branches = (brs ?? []) as unknown as { id: string; name: string }[];
  const validEventIds = new Set(events.map((e) => e.id));

  // 申込フォーム項目（列見出し）と、各参加者の回答（表示文字列）を取得する。
  const formIds = [...new Set(events.map((e) => e.form_id))];
  const { data: fieldData } = formIds.length
    ? await supabase
        .from("form_fields")
        .select("id,form_id,label,field_type,sort_order")
        .in("form_id", formIds)
        .order("sort_order", { ascending: true })
    : { data: [] };
  const fields = (fieldData ?? []) as unknown as {
    id: string;
    form_id: string;
    label: string;
    field_type: string;
    sort_order: number;
  }[];
  // form_id → 項目一覧（並び順）
  const fieldsByForm = new Map<string, RosterField[]>();
  for (const f of fields) {
    const arr = fieldsByForm.get(f.form_id) ?? [];
    arr.push({ id: f.id, label: f.label });
    fieldsByForm.set(f.form_id, arr);
  }

  // 回答（participant_values）と選択肢ラベル
  const { data: pvData } = participants.length
    ? await supabase
        .from("participant_values")
        .select("id,participant_id,form_field_id,value")
        .in("participant_id", participants.map((p) => p.id))
    : { data: [] };
  const pvs = (pvData ?? []) as unknown as {
    id: string;
    participant_id: string;
    form_field_id: string;
    value: string | null;
  }[];
  const pvIds = pvs.map((v) => v.id);
  const { data: pvoData } = pvIds.length
    ? await supabase
        .from("participant_value_options")
        .select("participant_value_id,form_field_option_id")
        .in("participant_value_id", pvIds)
    : { data: [] };
  const pvos = (pvoData ?? []) as unknown as {
    participant_value_id: string;
    form_field_option_id: string;
  }[];
  const optIds = [...new Set(pvos.map((o) => o.form_field_option_id))];
  const { data: optData } = optIds.length
    ? await supabase.from("form_field_options").select("id,label").in("id", optIds)
    : { data: [] };
  const optLabel = new Map(
    ((optData ?? []) as unknown as { id: string; label: string }[]).map((o) => [o.id, o.label]),
  );
  const fieldType = new Map(fields.map((f) => [f.id, f.field_type]));

  // participant_id → (form_field_id → 表示文字列)
  const valuesByParticipant = new Map<string, Record<string, string>>();
  for (const v of pvs) {
    const ft = fieldType.get(v.form_field_id);
    const isSelect = ft?.startsWith("select") || ft === "radio";
    let display: string;
    if (isSelect) {
      display = pvos
        .filter((o) => o.participant_value_id === v.id)
        .map((o) => optLabel.get(o.form_field_option_id) ?? "")
        .filter(Boolean)
        .join("、");
    } else {
      display = v.value ?? "";
    }
    const rec = valuesByParticipant.get(v.participant_id) ?? {};
    rec[v.form_field_id] = display;
    valuesByParticipant.set(v.participant_id, rec);
  }

  // 未対応の変更依頼（編集/キャンセル）。テーブル未作成等は無視。
  const reqMap = new Map<string, { type: "edit" | "cancel"; message: string | null }>();
  if (participants.length) {
    const { data: reqs, error: reqErr } = await supabase
      .from("change_requests")
      .select("participant_id,type,message,status")
      .in("participant_id", participants.map((p) => p.id))
      .eq("status", "open");
    if (!reqErr) {
      for (const r of (reqs ?? []) as unknown as {
        participant_id: string;
        type: "edit" | "cancel";
        message: string | null;
      }[]) {
        if (!reqMap.has(r.participant_id)) reqMap.set(r.participant_id, { type: r.type, message: r.message });
      }
    }
  }

  return apps
    .map((a) => {
      const ev = events.find((e) => e.id === a.event_id);
      const members = participants
        .filter((p) => p.application_id === a.id)
        .map((p) => ({
          participantId: p.id,
          name: names.find((n) => n.id === p.user_id)?.name ?? "（不明）",
          status: p.status,
          amount: p.total_amount,
          request: reqMap.get(p.id) ?? null,
          values: valuesByParticipant.get(p.id) ?? {},
        }));
      return {
        applicationId: a.id,
        eventId: a.event_id,
        eventName: ev?.name ?? "（不明なイベント）",
        eventDate: ev?.event_date ?? "",
        branchName: branches.find((b) => b.id === a.branch_id)?.name ?? "",
        applicationStatus: a.status,
        fields: ev ? fieldsByForm.get(ev.form_id) ?? [] : [],
        members,
      };
    })
    .filter((g) => g.members.length > 0 && validEventIds.has(g.eventId))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}
