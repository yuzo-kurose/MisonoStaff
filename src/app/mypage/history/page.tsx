import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, PageHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { yen, jpDate } from "@/lib/format";
import { getMyApplicationHistory } from "@/lib/queries/me";

export default async function HistoryPage() {
  const history = await getMyApplicationHistory();

  return (
    <AppShell role="participant">
      <Link
        href="/mypage"
        className="mb-3 inline-flex items-center gap-1 text-body-sm text-neutral-600 hover:text-neutral-900"
      >
        <ChevronLeft size={16} /> マイページに戻る
      </Link>

      <PageHeader title="申込履歴" description="過去の申込（取消分を含む）を確認できます。" />

      <div className="max-w-2xl">
        <Card>
          {history.length === 0 ? (
            <p className="py-6 text-center text-body-md text-neutral-600">申込履歴はまだありません。</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {history.map((h) => (
                <li key={h.participantId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-md text-neutral-900">{h.eventName}</p>
                    <p className="text-body-sm text-neutral-600">
                      {h.eventDate ? jpDate(h.eventDate) : ""}
                      <span className="mx-1.5 text-neutral-300">/</span>
                      {yen(h.amount)}
                      {h.status === "cancelled" && h.cancelledAt && (
                        <>
                          <span className="mx-1.5 text-neutral-300">/</span>
                          {jpDate(h.cancelledAt)} 取消
                        </>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={h.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
