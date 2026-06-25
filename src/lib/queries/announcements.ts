import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Announcement } from "@/types/database";

/**
 * ホーム表示用：公開中の連絡事項を新しい順で取得（未ログインでも閲覧可・RLS）。
 * 公開連絡事項は全ユーザー共通のため Next.js データキャッシュで共有する
 * （60秒 / tag "announcements"）。管理者の作成・編集・削除時は
 * revalidateTag("announcements") で即時無効化する。
 */
export const getPublishedAnnouncements = unstable_cache(
  async (): Promise<Announcement[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });
    return (data ?? []) as unknown as Announcement[];
  },
  ["published-announcements"],
  { revalidate: 60, tags: ["announcements"] },
);

/** 管理用：全件（非公開含む）を新しい順で取得。RLSにより管理者のみ全件見える。 */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("published_at", { ascending: false });
  return (data ?? []) as unknown as Announcement[];
}
