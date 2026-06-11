"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEventWithForm, getEventBranchIds } from "@/lib/queries/events";

/**
 * イベントを複製する（フォーム・項目・選択肢・対象拠点ごと）。
 *  - 複製先は status=draft（下書き）で作成し、誤公開を防ぐ
 *  - duplicated_from_event_id に複製元を記録
 * 完了後は複製先の編集画面へ遷移する。RLS により管理者のみ成功。
 */
export async function duplicateEvent(formData: FormData): Promise<void> {
  const sourceId = String(formData.get("eventId") ?? "");
  if (!sourceId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const src = await getEventWithForm(sourceId);
  if (!src) return;
  const branchIds = await getEventBranchIds(sourceId);

  // 1) フォーム複製
  const { data: formRow, error: fErr } = await supabase
    .from("forms")
    .insert({ name: `${src.formName || `${src.name} 申込フォーム`}（複製）` } as never)
    .select("id")
    .single();
  if (fErr) throw fErr;
  const formId = (formRow as { id: string }).id;

  // 2) イベント複製（下書きで作成）
  const { data: evRow, error: eErr } = await supabase
    .from("events")
    .insert({
      name: `${src.name}（複製）`,
      start_date: src.start_date,
      event_date: src.event_date,
      venue: src.venue,
      application_deadline: src.application_deadline,
      capacity: src.capacity,
      form_id: formId,
      status: "draft",
      duplicated_from_event_id: sourceId,
    } as never)
    .select("id")
    .single();
  if (eErr) throw eErr;
  const newEventId = (evRow as { id: string }).id;

  // 3) フォーム項目＋選択肢を複製
  for (const f of src.fields) {
    const { data: ffRow, error: ffErr } = await supabase
      .from("form_fields")
      .insert({
        form_id: formId,
        label: f.label,
        field_type: f.field_type,
        is_required: f.is_required,
        sort_order: f.sort_order,
        price_calc_type: f.price_calc_type,
        unit_price: f.unit_price,
      } as never)
      .select("id")
      .single();
    if (ffErr) throw ffErr;
    const newFieldId = (ffRow as { id: string }).id;
    if (f.options.length) {
      const { error: oErr } = await supabase.from("form_field_options").insert(
        f.options.map((o) => ({
          form_field_id: newFieldId,
          label: o.label,
          price: o.price,
          sort_order: o.sort_order,
        })) as never,
      );
      if (oErr) throw oErr;
    }
  }

  // 4) 対象拠点を複製
  if (branchIds.length) {
    const { error: ebErr } = await supabase
      .from("event_branches")
      .insert(branchIds.map((bid) => ({ event_id: newEventId, branch_id: bid })) as never);
    if (ebErr) throw ebErr;
  }

  revalidatePath("/admin/events");
  redirect(`/admin/events/${newEventId}/edit`);
}

/**
 * イベントを削除する。
 * 申込者（participants）が1人でもいる場合は削除を拒否する＝決済・申込データの巻き添え削除を防ぐ
 * （events 削除は applications→participants→payments へ CASCADE するため）。
 * RLS（events_write_admin）により管理者のみ成功。
 */
export async function deleteEvent(
  eventId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!eventId) return { ok: false, error: "対象が不明です。" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const { data: apps } = await supabase
    .from("applications")
    .select("id")
    .eq("event_id", eventId);
  const appIds = ((apps ?? []) as unknown as { id: string }[]).map((a) => a.id);
  if (appIds.length) {
    const { count } = await supabase
      .from("participants")
      .select("id", { count: "exact", head: true })
      .in("application_id", appIds);
    if ((count ?? 0) > 0)
      return {
        ok: false,
        error: "申込者がいるイベントは削除できません。先に申込を取り消してください。",
      };
  }

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/events");
  return { ok: true };
}
