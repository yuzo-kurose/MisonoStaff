import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/types/database";

/** ホーム表示用：公開中の連絡事項を新しい順で取得（未ログインでも閲覧可・RLS）。 */
export async function getPublishedAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  return (data ?? []) as unknown as Announcement[];
}

/** 管理用：全件（非公開含む）を新しい順で取得。RLSにより管理者のみ全件見える。 */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("published_at", { ascending: false });
  return (data ?? []) as unknown as Announcement[];
}
