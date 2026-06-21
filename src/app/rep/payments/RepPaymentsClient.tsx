"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Table, Th, Td } from "@/components/ui/Table";
import { MobileRecord } from "@/components/ui/MobileRecord";
import { yen } from "@/lib/format";
import type { ParticipantStatus } from "@/types/database";

export type PayRow = {
  participantId: string;
  name: string;
  eventName: string;
  amount: number;
  status: ParticipantStatus;
};

export function RepPaymentsClient({ rows }: { rows: PayRow[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const unpaid = rows.filter((r) => r.status === "confirmed");

  return (
    <AppShell role="representative">
      <PageHeader
        title="決済状況"
        description={`確定 ${rows.length}名 / 未決済 ${unpaid.length}名`}
        action={
          <Button
            disabled={unpaid.length === 0}
            onClick={() =>
              setMsg(`未決済 ${unpaid.length} 名へリマインドを送信しました（通知基盤実装後に実メール送信）。`)
            }
          >
            未決済者へまとめてリマインド（{unpaid.length}名）
          </Button>
        }
      />

      {msg && (
        <div className="mb-4">
          <Alert variant="success">{msg}</Alert>
        </div>
      )}

      {rows.length === 0 ? (
        <Alert variant="info">確定済みの参加者がいません。先に名簿を確定してください。</Alert>
      ) : (
        <>
          {/* スマホ：カード表示 */}
          <div className="space-y-2 md:hidden">
            {rows.map((m) => (
              <MobileRecord
                key={m.participantId}
                title={m.name}
                badge={<StatusBadge status={m.status} />}
                rows={[
                  { label: "イベント", value: m.eventName },
                  { label: "金額", value: yen(m.amount) },
                ]}
                action={
                  m.status === "confirmed" ? (
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setMsg(`${m.name} さんへリマインドを送信しました。`)}
                    >
                      リマインド
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </div>

          {/* PC：テーブル表示 */}
          <div className="hidden md:block">
            <Table
              head={
                <tr>
                  <Th>氏名</Th>
                  <Th>イベント</Th>
                  <Th>金額</Th>
                  <Th>状態</Th>
                  <Th>操作</Th>
                </tr>
              }
            >
              {rows.map((m) => (
                <tr key={m.participantId}>
                  <Td>{m.name}</Td>
                  <Td>{m.eventName}</Td>
                  <Td>{yen(m.amount)}</Td>
                  <Td>
                    <StatusBadge status={m.status} />
                  </Td>
                  <Td>
                    {m.status === "confirmed" ? (
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setMsg(`${m.name} さんへリマインドを送信しました。`)}
                      >
                        リマインド
                      </Button>
                    ) : (
                      <span className="text-body-sm text-neutral-600">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        </>
      )}
    </AppShell>
  );
}
