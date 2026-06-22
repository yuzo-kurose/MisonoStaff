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
import { MobileRecord } from "@/components/ui/MobileRecord";
import { yen, jpDate } from "@/lib/format";
import type { RosterGroup } from "@/lib/queries/roster";
import { confirmApplication, removeParticipant } from "./actions";
import { refundParticipant } from "@/app/admin/applications/actions";

export function RosterClient({ groups, isAdmin }: { groups: RosterGroup[]; isAdmin: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const all = groups.flatMap((g) => g.members);
  const stat = {
    total: all.length,
    confirmed: all.filter((m) => m.status === "confirmed" || m.status === "paid").length,
    applying: all.filter((m) => m.status === "applying").length,
    unpaid: all.filter((m) => m.status === "confirmed").length,
  };

  // イベント単位にまとめる（イベント → 拠点(application) → メンバー）。
  const byEvent = (() => {
    const m = new Map<
      string,
      { eventId: string; eventName: string; eventDate: string; apps: RosterGroup[] }
    >();
    for (const g of groups) {
      const e =
        m.get(g.eventId) ?? { eventId: g.eventId, eventName: g.eventName, eventDate: g.eventDate, apps: [] };
      e.apps.push(g);
      m.set(g.eventId, e);
    }
    return [...m.values()].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  })();

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

  // 申込中／確定（未決済）のキャンセル。確定済みは確認ダイアログを出す。
  const cancel = (participantId: string, status: string) => {
    if (status === "confirmed" && !window.confirm("この参加者をキャンセルしますか？（未決済）")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await removeParticipant(participantId);
      setMsg(
        res.ok
          ? { ok: true, text: "キャンセルしました。" }
          : { ok: false, text: `キャンセルに失敗：${res.error}` },
      );
    });
  };

  // 決済済みのキャンセル＝Stripe全額返金＋キャンセル（管理者のみ実行可）。
  const refund = (participantId: string) => {
    if (
      !window.confirm(
        "決済済みです。Stripeで全額返金してキャンセルします。よろしいですか？\n（前日まで全額返金／開催当日以降は返金できません）",
      )
    )
      return;
    setMsg(null);
    startTransition(async () => {
      const res = await refundParticipant(participantId);
      setMsg(
        res.ok
          ? { ok: true, text: "返金してキャンセルしました。" }
          : { ok: false, text: `返金に失敗：${res.error}` },
      );
    });
  };

  // 1メンバーの操作ボタン（表・スマホカードで共用）。
  const memberAction = (m: RosterGroup["members"][number]) => {
    if (m.status === "applying")
      return (
        <Button variant="ghost" size="md" onClick={() => cancel(m.participantId, m.status)}>
          名簿から外す
        </Button>
      );
    if (m.status === "confirmed")
      return (
        <Button variant="ghost" size="md" onClick={() => cancel(m.participantId, m.status)}>
          キャンセル
        </Button>
      );
    if (m.status === "paid")
      return isAdmin ? (
        <Button variant="ghost" size="md" onClick={() => refund(m.participantId)}>
          キャンセル（返金）
        </Button>
      ) : (
        <span className="text-body-sm text-neutral-500">返金は管理者へ</span>
      );
    return null;
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
          {byEvent.map((ev) => (
            <Card key={ev.eventId}>
              <div className="mb-4">
                <CardTitle>{ev.eventName}</CardTitle>
                <p className="text-body-sm text-neutral-600">{jpDate(ev.eventDate)}</p>
              </div>

              <div className="space-y-5">
                {ev.apps.map((g) => {
                  const applying = g.members.filter((m) => m.status === "applying").length;
                  return (
                    <div key={g.applicationId} className="rounded-lg border border-neutral-200 p-3 md:p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-heading-sm text-neutral-900">{g.branchName}</p>
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

                      {/* スマホ：カード表示 */}
                      <div className="space-y-2 md:hidden">
                        {g.members.map((m) => (
                          <MobileRecord
                            key={m.participantId}
                            title={m.name}
                            badge={<StatusBadge status={m.status} />}
                            rows={[{ label: "金額", value: yen(m.amount) }]}
                            action={memberAction(m) ?? undefined}
                          />
                        ))}
                      </div>

                      {/* PC：テーブル表示 */}
                      <div className="hidden md:block">
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
                              <Td>{memberAction(m) ?? <span className="text-body-sm text-neutral-600">—</span>}</Td>
                            </tr>
                          ))}
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
