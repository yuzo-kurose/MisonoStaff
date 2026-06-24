"use server";

import { createClient } from "@/lib/supabase/server";
import { FIXED_FIELDS } from "@/lib/forms/fixed";

export type CreateEventInput = {
  name: string;
  startDate: string;
  endDate: string;
  deadline: string;
  capacity: number | null;
  status: "draft" | "published";
};

/**
 * イベントを実DBに作成（基本情報のみ）。
 *  - 空の申込フォーム（forms）と events を作成する。
 *  - 料金・交通手段・対象拠点などの明細は、作成後に申込フォーム編集で項目として作る。
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
    // 1) 空の申込フォーム
    const { data: formRow, error: fErr } = await supabase
      .from("forms")
      .insert({ name: `${input.name} 申込フォーム` } as never)
      .select("id")
      .single();
    if (fErr) throw fErr;
    const formId = (formRow as { id: string }).id;

    // 1-2) 固定項目（参加費/往路/復路）を投入。
    //   いずれも単一選択・金額は選択肢ごと（option_based）。選択肢はイベントごとに後から設定。
    const fixedRows = FIXED_FIELDS.map((f, i) => ({
      form_id: formId,
      label: f.label,
      field_type: "select_single",
      is_required: true,
      sort_order: i,
      price_calc_type: "option_based",
      unit_price: null,
      field_key: f.key,
    }));
    const { error: ffErr } = await supabase.from("form_fields").insert(fixedRows as never);
    if (ffErr) throw ffErr;

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

    return { ok: true, eventId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "作成に失敗しました。" };
  }
}
