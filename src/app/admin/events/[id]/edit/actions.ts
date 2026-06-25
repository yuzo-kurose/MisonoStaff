"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EventFormPayload } from "../../EventForm";

/**
 * イベントの基本情報を更新する。
 * 料金・交通手段・対象拠点などの明細は申込フォーム編集で項目として管理する。
 * RLS により管理者のみ成功する。
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
  if (uErr) return { ok: false, error: uErr.message };

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}/edit`);
  revalidateTag("events"); // 公開イベント一覧キャッシュを即時無効化
  return { ok: true };
}
