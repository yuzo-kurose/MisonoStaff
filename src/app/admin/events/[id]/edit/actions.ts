"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EventFormPayload } from "../../EventForm";

// createEvent が生成する料金・交通手段の標準項目ラベル。編集ではこの3項目を入れ替える。
const STD_FEE_LABELS = ["スタッフ宿泊費", "往路（交通手段）", "復路（交通手段）"];

/**
 * イベントを更新（作成画面と同等のフル編集）。
 *  - events 行（基本情報・公開状態）
 *  - 対象拠点（event_branches）を入れ替え、新規拠点は branches に作成
 *  - 料金・交通手段の標準3項目（form_fields/options）を入れ替え
 *
 * RLS により管理者のみ成功する。
 * ※ saveForm と同様、未申込前提。申込（participant_values）が項目を参照している場合は
 *    delete→insert ではなく ID を保持する upsert に変更すること。
 */
export async function updateEvent(
  eventId: string,
  input: EventFormPayload,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  if (!input.name.trim()) return { ok: false, error: "イベント名を入力してください。" };
  if (!input.startDate || !input.endDate)
    return { ok: false, error: "開催期間を入力してください。" };
  if (input.endDate < input.startDate)
    return { ok: false, error: "開催当日は開催初日以降にしてください。" };

  const { data: evData, error: evErr } = await supabase
    .from("events")
    .select("form_id")
    .eq("id", eventId)
    .single();
  if (evErr || !evData) return { ok: false, error: "イベントが見つかりません。" };
  const formId = (evData as { form_id: string }).form_id;

  try {
    // 1) 基本情報
    const { error: uErr } = await supabase
      .from("events")
      .update({
        name: input.name,
        start_date: input.startDate,
        event_date: input.endDate,
        application_deadline: input.deadline || input.endDate,
        capacity: input.capacity,
        status: input.status,
      } as never)
      .eq("id", eventId);
    if (uErr) throw uErr;

    // 2) 対象拠点（既存削除 → 新規拠点作成 → 再登録）
    const { error: delEbErr } = await supabase
      .from("event_branches")
      .delete()
      .eq("event_id", eventId);
    if (delEbErr) throw delEbErr;

    const branchIds = [...input.existingBranchIds];
    for (const nm of input.newBranchNames.map((s) => s.trim()).filter(Boolean)) {
      const { data: bRow, error: bErr } = await supabase
        .from("branches")
        .insert({ name: nm, is_active: true } as never)
        .select("id")
        .single();
      if (bErr) throw bErr;
      branchIds.push((bRow as { id: string }).id);
    }
    if (branchIds.length) {
      const { error: ebErr } = await supabase
        .from("event_branches")
        .insert(branchIds.map((bid) => ({ event_id: eventId, branch_id: bid })) as never);
      if (ebErr) throw ebErr;
    }

    // 3) 料金・交通手段（標準3項目を入れ替え）
    const { error: delFErr } = await supabase
      .from("form_fields")
      .delete()
      .eq("form_id", formId)
      .in("label", STD_FEE_LABELS);
    if (delFErr) throw delFErr;

    const addField = async (
      sort: number,
      label: string,
      options: { label: string; price: number }[],
    ) => {
      const { data: ffRow, error: ffErr } = await supabase
        .from("form_fields")
        .insert({
          form_id: formId,
          label,
          field_type: "select_single",
          is_required: true,
          sort_order: sort,
          price_calc_type: "option_based",
          unit_price: null,
        } as never)
        .select("id")
        .single();
      if (ffErr) throw ffErr;
      const fieldId = (ffRow as { id: string }).id;
      if (options.length) {
        const { error: oErr } = await supabase.from("form_field_options").insert(
          options.map((o, j) => ({
            form_field_id: fieldId,
            label: o.label,
            price: o.price,
            sort_order: j,
          })) as never,
        );
        if (oErr) throw oErr;
      }
    };

    const busPrice = (label: string, fare: number) => (label.includes("バス") ? fare : 0);

    await addField(1, "スタッフ宿泊費", [
      { label: "宿泊する", price: input.lodgingFee },
      { label: "宿泊しない", price: 0 },
    ]);
    await addField(
      2,
      "往路（交通手段）",
      input.outboundOptions
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label) => ({ label, price: busPrice(label, input.outboundFare) })),
    );
    await addField(
      3,
      "復路（交通手段）",
      input.inboundOptions
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label) => ({ label, price: busPrice(label, input.inboundFare) })),
    );

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました。" };
  }
}
