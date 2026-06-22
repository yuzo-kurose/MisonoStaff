import { getPublishedEvents } from "@/lib/queries/events";
import { getDepartmentNames } from "@/lib/queries/departments";
import { getBranches } from "@/lib/queries/branches";
import { getAuthContext } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { divisions } from "@/lib/mock/data";
import { ProxyClient } from "./ProxyClient";

export default async function ProxyPage() {
  const [events, departments, auth] = await Promise.all([
    getPublishedEvents(),
    getDepartmentNames(),
    getAuthContext(),
  ]);

  // 登録先拠点：管理者は全拠点、代表者は自分が代表を務める拠点（拠点マスタ）。
  let branches: { id: string; name: string }[] = [];
  if (auth.role === "admin") {
    branches = (await getBranches()).map((b) => ({ id: b.id, name: b.name }));
  } else if (auth.userId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("branches")
      .select("id,name")
      .eq("representative_user_id", auth.userId)
      .order("name", { ascending: true });
    branches = (data ?? []) as { id: string; name: string }[];
  }

  return (
    <ProxyClient
      events={events.map((e) => ({ id: e.id, name: e.name, venue: e.venue }))}
      divisions={divisions.map((d) => ({ value: d.value, label: d.label }))}
      departments={departments}
      branches={branches}
    />
  );
}
