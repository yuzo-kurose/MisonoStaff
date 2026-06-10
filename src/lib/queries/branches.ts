import { createClient } from "@/lib/supabase/server";
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

/** 拠点一覧（代表者名つき）。 */
export async function getBranches(): Promise<
  (Branch & { representativeName: string | null })[]
> {
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .order("name", { ascending: true });
  const list = (branches ?? []) as unknown as Branch[];

  const repIds = list
    .map((b) => b.representative_user_id)
    .filter((v): v is string => !!v);
  let reps: { id: string; name: string }[] = [];
  if (repIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id,name")
      .in("id", repIds);
    reps = (data ?? []) as unknown as { id: string; name: string }[];
  }

  return list.map((b) => ({
    ...b,
    representativeName:
      reps.find((r) => r.id === b.representative_user_id)?.name ?? null,
  }));
}
