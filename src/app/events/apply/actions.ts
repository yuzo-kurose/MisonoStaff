"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApplyValue = {
  fieldId: string;
  value: string | null; // text/textarea/number/date
  optionIds: string[]; // select_single/select_multiple
};
export type ApplyInput = {
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
): Promise<{ ok: boolean; created?: number; skipped?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  // 所属拠点
  const { data: profileData } = await supabase
    .from("profiles")
    .select("branch_id")
    .eq("id", user.id)
    .single();
  const branchId = (profileData as { branch_id: string | null } | null)?.branch_id;
  if (!branchId) return { ok: false, error: "所属拠点が設定されていません。" };

  const admin = createAdminClient();
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

    // 既に申込済みならスキップ
    const { data: existing } = await admin
      .from("participants")
      .select("id")
      .eq("application_id", applicationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      skipped++;
      continue;
    }

    // participant 作成
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
    const participantId = (partNew as { id: string }).id;

    // 入力値
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
      if (pvErr) return { ok: false, error: pvErr.message };
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
        if (pvoErr) return { ok: false, error: pvoErr.message };
      }
    }
    created++;
  }

  return { ok: true, created, skipped };
}
