import { createClient } from "@/lib/supabase/server";
import type { ParticipantStatus } from "@/types/database";

export type AppRow = {
  participantId: string;
  name: string;
  division: string; // 部（学生部/成人部 等）
  department: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  branchId: string;
  branchName: string;
  status: ParticipantStatus;
  amount: number;
  refundable: boolean; // 支払済 かつ 開催前日まで
  values: Record<string, string>; // フォーム項目ID → 回答の表示文字列
};
export type AppField = { id: string; label: string };
export type AdminApplications = {
  rows: AppRow[];
  fieldsByEvent: Record<string, AppField[]>; // イベントID → 申込フォーム項目（列見出し）
};

/** 管理者：全申込（人単位明細＋フォーム回答）。 */
export async function getAdminApplications(): Promise<AdminApplications> {
  const supabase = await createClient();

  const { data: partData } = await supabase
    .from("participants")
    .select("id,application_id,user_id,status,total_amount");
  const participants = (partData ?? []) as unknown as {
    id: string;
    application_id: string;
    user_id: string;
    status: ParticipantStatus;
    total_amount: number;
  }[];
  if (participants.length === 0) return { rows: [], fieldsByEvent: {} };

  const [{ data: apps }, { data: profs }] = await Promise.all([
    supabase
      .from("applications")
      .select("id,event_id,branch_id")
      .in("id", [...new Set(participants.map((p) => p.application_id))]),
    supabase
      .from("profiles")
      .select("id,name,division,department")
      .in("id", [...new Set(participants.map((p) => p.user_id))]),
  ]);
  const appList = (apps ?? []) as unknown as { id: string; event_id: string; branch_id: string }[];
  const names = (profs ?? []) as unknown as {
    id: string;
    name: string;
    division: string | null;
    department: string | null;
  }[];

  const [{ data: evs }, { data: brs }] = await Promise.all([
    // 論理削除済みイベントは申込一覧に出さない。
    supabase
      .from("events")
      .select("id,name,event_date,form_id")
      .in("id", [...new Set(appList.map((a) => a.event_id))])
      .is("deleted_at", null),
    supabase.from("branches").select("id,name").in("id", [...new Set(appList.map((a) => a.branch_id))]),
  ]);
  const events = (evs ?? []) as unknown as { id: string; name: string; event_date: string; form_id: string }[];
  const branches = (brs ?? []) as unknown as { id: string; name: string }[];
  const validEventIds = new Set(events.map((e) => e.id));

  // 申込フォーム項目（列見出し）と回答（表示文字列）を取得する。
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
  const fieldsByForm = new Map<string, AppField[]>();
  for (const f of fields) {
    const arr = fieldsByForm.get(f.form_id) ?? [];
    arr.push({ id: f.id, label: f.label });
    fieldsByForm.set(f.form_id, arr);
  }
  const fieldType = new Map(fields.map((f) => [f.id, f.field_type]));

  // 回答（participant_values）＋選択肢ラベル。
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

  const valuesByParticipant = new Map<string, Record<string, string>>();
  for (const v of pvs) {
    const ft = fieldType.get(v.form_field_id);
    const isSelect = ft?.startsWith("select") || ft === "radio";
    const display = isSelect
      ? pvos
          .filter((o) => o.participant_value_id === v.id)
          .map((o) => optLabel.get(o.form_field_option_id) ?? "")
          .filter(Boolean)
          .join("、")
      : v.value ?? "";
    const rec = valuesByParticipant.get(v.participant_id) ?? {};
    rec[v.form_field_id] = display;
    valuesByParticipant.set(v.participant_id, rec);
  }

  // イベントID → 項目一覧（列見出し）
  const fieldsByEvent: Record<string, AppField[]> = {};
  for (const e of events) fieldsByEvent[e.id] = fieldsByForm.get(e.form_id) ?? [];

  const today = new Date().toISOString().slice(0, 10);

  const rows = participants
    .filter((p) => {
      const app = appList.find((a) => a.id === p.application_id);
      return app && validEventIds.has(app.event_id);
    })
    .map((p) => {
      const app = appList.find((a) => a.id === p.application_id);
      const ev = events.find((e) => e.id === app?.event_id);
      const eventDate = ev?.event_date ?? "";
      const prof = names.find((n) => n.id === p.user_id);
      return {
        participantId: p.id,
        name: prof?.name ?? "（不明）",
        division: prof?.division ?? "",
        department: prof?.department ?? "",
        eventId: app?.event_id ?? "",
        eventName: ev?.name ?? "（不明）",
        eventDate,
        branchId: app?.branch_id ?? "",
        branchName: branches.find((b) => b.id === app?.branch_id)?.name ?? "",
        status: p.status,
        amount: p.total_amount,
        refundable: p.status === "paid" && eventDate > today, // 前日まで全額・当日不可
        values: valuesByParticipant.get(p.id) ?? {},
      };
    });

  return { rows, fieldsByEvent };
}
