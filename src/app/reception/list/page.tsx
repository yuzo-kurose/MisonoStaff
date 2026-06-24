import { Card, PageHeader } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  checked_in_at: string | null;
  method: string | null;
  participants: {
    profiles: { name: string } | null;
    applications: { events: { name: string; venue: string | null } | null } | null;
  } | null;
};

/** 本日の開始時刻（ローカル0時）のISO。受付一覧を当日分に絞るため。 */
function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function jpTime(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

/**
 * 受付一覧：本日 受付（チェックイン）が完了した人の一覧。
 * attendances は RLS で受付/管理者が SELECT 可。participants→profiles は FK が複数あるため
 * participants_user_id_fkey を明示して埋め込む。
 */
export default async function ReceptionListPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendances")
    .select(
      "id,checked_in_at,method,participants!inner(profiles!participants_user_id_fkey(name),applications!inner(events!inner(name,venue)))",
    )
    .eq("status", "checked_in")
    .gte("checked_in_at", startOfTodayISO())
    .order("checked_in_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="受付一覧" description="本日 受付が完了した方の一覧です（新しい順）。" />
      <Card>
        {error ? (
          <p className="py-8 text-center text-body-sm text-error-900">
            取得に失敗しました：{error.message}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-body-md text-neutral-600">
            本日の受付はまだありません。
          </p>
        ) : (
          <>
            <p className="mb-3 text-body-sm text-neutral-600">本日 {rows.length} 件</p>
            <ul className="divide-y divide-neutral-200">
              {rows.map((r) => {
                const name = r.participants?.profiles?.name ?? "（不明）";
                const ev = r.participants?.applications?.events;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-body-md text-neutral-900">{name}</p>
                      <p className="truncate text-body-sm text-neutral-600">
                        {ev?.name ?? "—"}
                        {ev?.venue ? `（${ev.venue}）` : ""}
                      </p>
                    </div>
                    <div className="flex flex-none items-center gap-3">
                      <span className="text-body-sm text-neutral-600">{jpTime(r.checked_in_at)}</span>
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-label-sm font-medium text-neutral-700">
                        {r.method === "qr" ? "QR" : r.method === "name_search" ? "氏名検索" : "手動"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
