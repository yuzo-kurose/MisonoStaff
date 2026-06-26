import { getPublishedEvents } from "@/lib/queries/events";
import { getBranches } from "@/lib/queries/branches";
import { getAuthContext } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { divisions } from "@/lib/mock/data";
import { ProxyClient } from "./ProxyClient";

export default async function ProxyPage() {
  const [events, auth] = await Promise.all([getPublishedEvents(), getAuthContext()]);
  const supabase = await createClient();

  // 登録先拠点：管理者は全拠点、代表者は自分が代表を務める拠点（拠点マスタ）。
  let branches: { id: string; name: string }[] = [];
  if (auth.role === "admin") {
    branches = (await getBranches()).map((b) => ({ id: b.id, name: b.name }));
  } else if (auth.userId) {
    const { data } = await supabase
      .from("branches")
      .select("id,name")
      .eq("representative_user_id", auth.userId)
      .order("name", { ascending: true });
    branches = (data ?? []) as { id: string; name: string }[];
  }

  // 登録先拠点の初期値：ログイン中ユーザーの所属（profiles.branch_id）。
  let defaultBranchId: string | undefined;
  if (auth.userId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("branch_id")
      .eq("id", auth.userId)
      .maybeSingle();
    defaultBranchId = (prof as { branch_id: string | null } | null)?.branch_id ?? undefined;
  }

  return (
    <ProxyClient
      events={events.map((e) => ({ id: e.id, name: e.name, venue: e.venue, date: e.event_date }))}
      divisions={divisions.map((d) => ({ value: d.value, label: d.label }))}
      branches={branches}
      defaultBranchId={defaultBranchId}
    />
  );
}
