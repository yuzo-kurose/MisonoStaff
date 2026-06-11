import { createClient } from "@/lib/supabase/server";
import type { Department } from "@/types/database";

/** プルダウン用：有効な部署名の一覧（表示順）。 */
export async function getDepartmentNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("name,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return ((data ?? []) as unknown as { name: string }[]).map((d) => d.name);
}

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
