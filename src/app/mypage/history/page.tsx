import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { MobileRecord } from "@/components/ui/MobileRecord";
import { yen, jpDate } from "@/lib/format";
import { getMyApplicationHistory } from "@/lib/queries/me";

export default async function HistoryPage() {
  const history = await getMyApplicationHistory();

  return (
    <>
      <Link
        href="/mypage"
        className="mb-3 inline-flex items-center gap-1 text-body-sm text-neutral-600 hover:text-neutral-900"
      >
        <ChevronLeft size={16} /> マイページに戻る
      </Link>

      <PageHeader title="申込履歴" description="過去の申込（取消分を含む）を確認できます。" />

      {history.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-body-md text-neutral-600">申込履歴はまだありません。</p>
        </Card>
      ) : (
        <>
          {/* スマホ：カード */}
          <div className="space-y-2 md:hidden">
            {history.map((h) => (
              <MobileRecord
                key={h.participantId}
                title={h.eventName}
                badge={<StatusBadge status={h.status} />}
                rows={[
                  { label: "開催日", value: h.eventDate ? jpDate(h.eventDate) : "—" },
                  { label: "申込日", value: h.appliedAt ? jpDate(h.appliedAt) : "—" },
                  { label: "金額", value: yen(h.amount) },
                  ...(h.status === "cancelled" && h.cancelledAt
                    ? [{ label: "取消日", value: jpDate(h.cancelledAt) }]
                    : []),
                ]}
              />
            ))}
          </div>

          {/* PC：テーブル */}
          <div className="hidden md:block">
            <Table
              head={
                <tr>
                  <Th>イベント</Th>
                  <Th>開催日</Th>
                  <Th>申込日</Th>
                  <Th>金額</Th>
                  <Th>状態</Th>
                </tr>
              }
            >
              {history.map((h) => (
                <tr key={h.participantId}>
                  <Td>{h.eventName}</Td>
                  <Td>{h.eventDate ? jpDate(h.eventDate) : <span className="text-neutral-400">—</span>}</Td>
                  <Td>{h.appliedAt ? jpDate(h.appliedAt) : <span className="text-neutral-400">—</span>}</Td>
                  <Td>
                    <span className="tabular-nums">{yen(h.amount)}</span>
                  </Td>
                  <Td>
                    <StatusBadge status={h.status} />
                    {h.status === "cancelled" && h.cancelledAt && (
                      <span className="ml-2 text-label-sm text-neutral-500">{jpDate(h.cancelledAt)} 取消</span>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        </>
      )}
    </>
  );
}
