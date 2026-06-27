import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Department } from "@/types/database";

/**
 * プルダウン用：有効な部署名の一覧（表示順）。
 * 全ユーザー共通のマスタのため Next.js データキャッシュで共有（60秒 / tag "departments"）。
 * departments は anon 読み取り可のため、クッキーレスの公開クライアントで取得する。
 * 部署の作成・更新・削除時は revalidateTag("departments") で即時無効化。
 */
export const getDepartmentNames = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("departments")
      .select("name,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    return ((data ?? []) as unknown as { name: string }[]).map((d) => d.name);
  },
  ["department-names"],
  { revalidate: 60, tags: ["departments"] },
);

/** 管理画面用：全部署（無効含む・編集に必要な id 付き）。 */
export async function getDepartments(): Promise<Department[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as unknown as Department[];
}
