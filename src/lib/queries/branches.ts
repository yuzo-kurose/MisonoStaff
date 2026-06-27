import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Branch } from "@/types/database";

/** 代表者に設定できるアクティブな利用者（拠点マスタの代表者設定で使用）。 */
export async function getRepresentativeCandidates(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,name")
    .eq("status", "active")
    .order("name", { ascending: true });
  return (data ?? []) as unknown as { id: string; name: string }[];
}

/**
 * 拠点一覧（代表者名つき）。
 * 全認証ユーザーで同一内容（マスタ）のため Next.js データキャッシュで共有する
 * （60秒 / tag "branches"）。拠点の作成・更新時は revalidateTag("branches") で即時無効化。
 * branches は anon が読めない（RLS）ため、クッキーを使わない service_role で取得して
 * キャッシュ可能にする（返す内容は認証ユーザーが RLS 経由で見られるものと同一）。
 */
export const getBranches = unstable_cache(
  async (): Promise<(Branch & { representativeName: string | null })[]> => {
    const admin = createAdminClient();
    const { data: branches } = await admin
      .from("branches")
      .select("*")
      .order("name", { ascending: true });
    const list = (branches ?? []) as unknown as Branch[];

    const repIds = list
      .map((b) => b.representative_user_id)
      .filter((v): v is string => !!v);
    let reps: { id: string; name: string }[] = [];
    if (repIds.length) {
      const { data } = await admin.from("profiles").select("id,name").in("id", repIds);
      reps = (data ?? []) as unknown as { id: string; name: string }[];
    }

    return list.map((b) => ({
      ...b,
      representativeName: reps.find((r) => r.id === b.representative_user_id)?.name ?? null,
    }));
  },
  ["branches-list"],
  { revalidate: 60, tags: ["branches"] },
);
