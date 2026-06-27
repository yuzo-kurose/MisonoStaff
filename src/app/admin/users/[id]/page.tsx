import Link from "next/link";
import { PageHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { MobileRecord } from "@/components/ui/MobileRecord";
import { yen, jpDate } from "@/lib/format";
import { getUserHistory } from "../actions";
import { getBranches } from "@/lib/queries/branches";
import { UserInfoClient } from "./UserInfoClient";

export default async function UserHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, branchesRaw] = await Promise.all([getUserHistory(id), getBranches()]);
  const branches = branchesRaw.map((b) => ({ id: b.id, name: b.name }));

  if (!data) {
    return (
      <>
        <Alert variant="error">ユーザーが見つからないか、権限がありません。</Alert>
        <div className="mt-4">
          <Link href="/admin/users" className="text-link underline">
            ユーザー一覧へ戻る
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`ユーザー詳細：${data.user.name}`}
        description="基本情報の確認・部／権限の変更と、申込履歴の確認ができます。"
      />
      <div className="mb-4">
        <Link href="/admin/users" className="text-link underline">
          ← ユーザー一覧へ戻る
        </Link>
      </div>

      <UserInfoClient user={data.user} branches={branches} />

      <h2 className="mb-3 text-heading-sm text-neutral-900">申込履歴</h2>
      {data.rows.length === 0 ? (
        <Alert variant="info">申込履歴がありません。</Alert>
      ) : (
        <>
          {/* スマホ：カード */}
          <div className="space-y-2 md:hidden">
            {data.rows.map((r) => (
              <MobileRecord
                key={r.participantId}
                title={r.eventName}
                summary={yen(r.amount)}
                badge={<StatusBadge status={r.status} />}
                rows={[
                  { label: "開催日", value: r.eventDate ? jpDate(r.eventDate) : "—" },
                  { label: "拠点", value: r.branchName || "—" },
                  { label: "申込日", value: r.appliedAt ? jpDate(r.appliedAt) : "—" },
                  { label: "取消日", value: r.cancelledAt ? jpDate(r.cancelledAt) : "—" },
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
                  <Th>拠点</Th>
                  <Th>金額</Th>
                  <Th>状態</Th>
                  <Th>申込日</Th>
                  <Th>取消日</Th>
                </tr>
              }
            >
              {data.rows.map((r) => (
                <tr key={r.participantId}>
                  <Td>{r.eventName}</Td>
                  <Td>{r.eventDate ? jpDate(r.eventDate) : "—"}</Td>
                  <Td>{r.branchName || "—"}</Td>
                  <Td>
                    <span className="tabular-nums">{yen(r.amount)}</span>
                  </Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td>{r.appliedAt ? jpDate(r.appliedAt) : "—"}</Td>
                  <Td>{r.cancelledAt ? jpDate(r.cancelledAt) : "—"}</Td>
                </tr>
              ))}
            </Table>
          </div>
        </>
      )}
    </>
  );
}
