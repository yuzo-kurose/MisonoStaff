"use server";

import { createClient } from "@/lib/supabase/server";

export type CreateEventInput = {
  name: string;
  startDate: string;
  endDate: string;
  deadline: string;
  capacity: number | null;
  status: "draft" | "published";
  lodgingFee: number;
  outboundFare: number;
  inboundFare: number;
  outboundOptions: string[];
  inboundOptions: string[];
  existingBranchIds: string[];
  newBranchNames: string[];
};

/**
 * イベントを実DBに作成。
 *  - forms / events を作成
 *  - 対象拠点（既存＋新規）を branches/event_branches に
 *  - 料金・交通手段を form_fields/form_field_options に
 * RLS により管理者のみ成功。戻り値の eventId でフォーム編集へ遷移する。
 */
export async function createEvent(
  input: CreateEventInput,
): Promise<{ ok: boolean; eventId?: string; error?: string }> {
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

  try {
    // 1) フォーム
    const { data: formRow, error: fErr } = await supabase
      .from("forms")
      .insert({ name: `${input.name} 申込フォーム` } as never)
      .select("id")
      .single();
    if (fErr) throw fErr;
    const formId = (formRow as { id: string }).id;

    // 2) イベント
    const { data: evRow, error: eErr } = await supabase
      .from("events")
      .insert({
        name: input.name,
        start_date: input.startDate,
        event_date: input.endDate,
        application_deadline: input.deadline || input.endDate,
        capacity: input.capacity,
        form_id: formId,
        status: input.status,
      } as never)
      .select("id")
      .single();
    if (eErr) throw eErr;
    const eventId = (evRow as { id: string }).id;

    // 3) 対象拠点（新規拠点を作成）
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

    // 4) フォーム項目（料金・交通手段）
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

    const busPrice = (label: string, fare: number) =>
      label.includes("バス") ? fare : 0;

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

    return { ok: true, eventId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "作成に失敗しました。" };
  }
}
