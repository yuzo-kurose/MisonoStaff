"use client";

import { useState, useTransition } from "react";
import { Users, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { Alert } from "@/components/ui/Alert";
import { Table, Th, Td } from "@/components/ui/Table";
import { yen, jpDate } from "@/lib/format";
import type { RosterGroup } from "@/lib/queries/roster";
import { confirmApplication, removeParticipant } from "./actions";

export function RosterClient({ groups }: { groups: RosterGroup[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const all = groups.flatMap((g) => g.members);
  const stat = {
    total: all.length,
    confirmed: all.filter((m) => m.status === "confirmed" || m.status === "paid").length,
    applying: all.filter((m) => m.status === "applying").length,
    unpaid: all.filter((m) => m.status === "confirmed").length,
  };

  const confirm = (applicationId: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await confirmApplication(applicationId);
      setMsg(
        res.ok
          ? { ok: true, text: "名簿を確定しました。確定者へ決済依頼が可能です。" }
          : { ok: false, text: `確定に失敗：${res.error}` },
      );
    });
  };

  const remove = (participantId: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await removeParticipant(participantId);
      if (!res.ok) setMsg({ ok: false, text: `除外に失敗：${res.error}` });
    });
  };

  return (
    <AppShell role="representative">
      <PageHeader
        title="拠点名簿の確認・確定"
        description="申込締切（毎月25日）までに確定してください。確定後、各参加者へまとめて決済依頼が可能になります。"
      />

      <StatGrid>
        <StatCard icon={Users} label="申込者数" value={stat.total} variant="primary" />
        <StatCard icon={CheckCircle2} label="確定" value={stat.confirmed} variant="success" />
        <StatCard icon={Clock} label="未確定" value={stat.applying} variant="warning" />
        <StatCard icon={CreditCard} label="未決済" value={stat.unpaid} variant="info" />
      </StatGrid>

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      {groups.length === 0 ? (
        <Alert variant="info">対象の名簿がありません。</Alert>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => {
            const applying = g.members.filter((m) => m.status === "applying").length;
            return (
              <Card key={g.applicationId}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>{g.eventName}</CardTitle>
                    <p className="text-body-sm text-neutral-600">
                      {jpDate(g.eventDate)}・{g.branchName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {g.applicationStatus === "confirmed" ? (
                      <Badge variant="success">確定済み</Badge>
                    ) : (
                      <span className="text-body-sm text-neutral-600">
                        {g.members.length}名（未確定 {applying}名）
                      </span>
                    )}
                    <Button
                      size="md"
                      disabled={pending || applying === 0}
                      onClick={() => confirm(g.applicationId)}
                    >
                      未確定を確定する
                    </Button>
                  </div>
                </div>
                <Table
                  head={
                    <tr>
                      <Th>氏名</Th>
                      <Th>金額</Th>
                      <Th>状態</Th>
                      <Th>操作</Th>
                    </tr>
                  }
                >
                  {g.members.map((m) => (
                    <tr key={m.participantId}>
                      <Td>{m.name}</Td>
                      <Td>{yen(m.amount)}</Td>
                      <Td>
                        <StatusBadge status={m.status} />
                      </Td>
                      <Td>
                        {m.status === "applying" ? (
                          <Button variant="ghost" size="md" onClick={() => remove(m.participantId)}>
                            名簿から外す
                          </Button>
                        ) : (
                          <span className="text-body-sm text-neutral-600">—</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </Table>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
