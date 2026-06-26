import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { EventRow, FormField, FormFieldOption } from "@/types/database";

/**
 * データ取得関数の例（イベント）。各画面の Server Component から呼び出し、
 * モックを置き換えていく際の参考。
 *
 * ※ 型は手書き Database 型のため、結果は明示キャストしている。
 *    実接続後 `supabase gen types typescript` で自動生成に置き換えるとキャスト不要になる。
 */

/**
 * 公開中イベントを開催日順で取得。
 * 公開イベントは全ユーザー共通のため Next.js データキャッシュで共有する
 * （60秒 / tag "events"）。管理者の作成・編集・削除時は revalidateTag("events")
 * で即時無効化する（admin/events の各アクション）。
 */
export const getPublishedEvents = unstable_cache(
  async (): Promise<EventRow[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("event_date", { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as EventRow[];
  },
  ["published-events"],
  { revalidate: 60, tags: ["events"] },
);

export type EventListItem = EventRow & {
  formName: string;
  fieldCount: number;
};

/** 管理用：全イベント（フォーム名・項目数つき）を開催日順で取得 */
export async function getAdminEvents(): Promise<EventListItem[]> {
  const supabase = await createClient();
  const [{ data: evs }, { data: forms }, { data: fields }] = await Promise.all([
    supabase.from("events").select("*").is("deleted_at", null).order("event_date", { ascending: true }),
    supabase.from("forms").select("id,name"),
    supabase.from("form_fields").select("id,form_id"),
  ]);
  const events = (evs ?? []) as unknown as EventRow[];
  const formList = (forms ?? []) as unknown as { id: string; name: string }[];
  const fieldList = (fields ?? []) as unknown as { id: string; form_id: string }[];

  return events.map((e) => ({
    ...e,
    formName: formList.find((f) => f.id === e.form_id)?.name ?? "",
    fieldCount: fieldList.filter((f) => f.form_id === e.form_id).length,
  }));
}

/** 管理用：論理削除済みイベント（復元用）。削除日時の新しい順。 */
export async function getDeletedEvents(): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  return (data ?? []) as unknown as EventRow[];
}

/** ダッシュボード統計（参加者・売上は participants/payments から） */
export async function getEventStats() {
  const supabase = await createClient();
  const [{ count: eventCount }, { count: publishedCount }, { count: participantCount }] =
    await Promise.all([
      supabase.from("events").select("*", { count: "exact", head: true }).is("deleted_at", null),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .is("deleted_at", null),
      supabase.from("participants").select("*", { count: "exact", head: true }),
    ]);
  const { data: paid } = await supabase
    .from("participants")
    .select("total_amount")
    .eq("status", "paid");
  const revenue = ((paid ?? []) as unknown as { total_amount: number }[]).reduce(
    (s, p) => s + (p.total_amount ?? 0),
    0,
  );
  return {
    eventCount: eventCount ?? 0,
    publishedCount: publishedCount ?? 0,
    participantCount: participantCount ?? 0,
    revenue,
  };
}

/** イベントに紐づく対象拠点の branch_id 一覧（編集画面の初期選択に使用） */
export async function getEventBranchIds(eventId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_branches")
    .select("branch_id")
    .eq("event_id", eventId);
  return ((data ?? []) as unknown as { branch_id: string }[]).map((r) => r.branch_id);
}

export type EventWithForm = EventRow & {
  formName: string;
  formDescription: string | null;
  fields: (FormField & { options: FormFieldOption[] })[];
};

/** イベント1件＋紐づくフォーム名・項目・選択肢を取得（フォームビルダー/申込で使用） */
export async function getEventWithForm(eventId: string): Promise<EventWithForm | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  const event = data as unknown as EventRow | null;
  if (error || !event) return null;

  const { data: formRow } = await supabase
    .from("forms")
    .select("name,description")
    .eq("id", event.form_id)
    .single();
  const formName = (formRow as { name: string } | null)?.name ?? "";
  const formDescription = (formRow as { description: string | null } | null)?.description ?? null;

  const { data: fieldsData } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", event.form_id)
    .order("sort_order", { ascending: true });
  const fields = (fieldsData ?? []) as unknown as FormField[];

  const fieldIds = fields.map((f) => f.id);
  let options: FormFieldOption[] = [];
  if (fieldIds.length) {
    const { data: optData } = await supabase
      .from("form_field_options")
      .select("*")
      .in("form_field_id", fieldIds)
      .order("sort_order", { ascending: true });
    options = (optData ?? []) as unknown as FormFieldOption[];
  }

  return {
    ...event,
    formName,
    formDescription,
    fields: fields.map((f) => ({
      ...f,
      options: options.filter((o) => o.form_field_id === f.id),
    })),
  };
}
