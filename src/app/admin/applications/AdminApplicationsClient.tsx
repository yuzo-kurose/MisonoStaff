"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle2, Coins, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Table, Th, Td } from "@/components/ui/Table";
import { yen } from "@/lib/format";
import type { AppRow } from "@/lib/queries/applications";
import { refundParticipant } from "./actions";

export function AdminApplicationsClient({ rows }: { rows: AppRow[] }) {
  const router = useRouter();
  const [eventId, setEventId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const events = useMemo(
    () => [...new Map(rows.map((r) => [r.eventId, r.eventName])).entries()],
    [rows],
  );
  const branches = useMemo(
    () => [...new Map(rows.map((r) => [r.branchId, r.branchName])).entries()],
    [rows],
  );

  const filtered = rows.filter(
    (r) =>
      (eventId === "" || r.eventId === eventId) &&
      (branchId === "" || r.branchId === branchId) &&
      (status === "" || r.status === status),
  );
  const paidTotal = filtered
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  const exportCsv = () => {
    const header = ["氏名", "イベント", "拠点", "状態", "金額"];
    const body = filtered.map((r) => [r.name, r.eventName, r.branchName, r.status, String(r.amount)]);
    const csv = [header, ...body]
      .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "applications.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const refund = (participantId: string, name: string) => {
    if (!confirm(`${name} さんの申込を返金（キャンセル）します。よろしいですか？`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await refundParticipant(participantId);
      if (res.ok) {
        setMsg({ ok: true, text: "返金しました。" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: `返金に失敗：${res.error}` });
      }
    });
  };

  return (
    <AppShell role="admin">
      <PageHeader
        title="申込一覧"
        description="イベント・拠点・状態で絞り込み。人単位の明細を表示します。"
        action={
          <Button variant="secondary" onClick={exportCsv}>
            CSV出力
          </Button>
        }
      />

      <StatGrid>
        <StatCard icon={Users} label="申込総数" value={rows.length} variant="primary" />
        <StatCard
          icon={CheckCircle2}
          label="支払済"
          value={rows.filter((r) => r.status === "paid").length}
          variant="success"
        />
        <StatCard
          icon={Coins}
          label="売上"
          value={yen(rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0))}
          variant="warning"
        />
        <StatCard
          icon={XCircle}
          label="キャンセル"
          value={rows.filter((r) => r.status === "cancelled").length}
          variant="neutral"
        />
      </StatGrid>

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-56">
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">すべてのイベント</option>
            {events.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">すべての拠点</option>
            {branches.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">すべての状態</option>
            <option value="applying">申込中</option>
            <option value="confirmed">確定</option>
            <option value="paid">支払済</option>
            <option value="cancelled">キャンセル</option>
          </Select>
        </div>
      </div>

      <p className="mb-3 text-body-sm text-neutral-700">
        {filtered.length}件 / 支払済合計{" "}
        <span className="text-label-lg text-primary-900">{yen(paidTotal)}</span>
      </p>

      <Table
        head={
          <tr>
            <Th>氏名</Th>
            <Th>イベント</Th>
            <Th>拠点</Th>
            <Th>金額</Th>
            <Th>状態</Th>
            <Th>操作</Th>
          </tr>
        }
      >
        {filtered.map((r) => (
          <tr key={r.participantId}>
            <Td>{r.name}</Td>
            <Td>{r.eventName}</Td>
            <Td>{r.branchName}</Td>
            <Td>{yen(r.amount)}</Td>
            <Td>
              <StatusBadge status={r.status} />
            </Td>
            <Td>
              {r.status === "paid" ? (
                r.refundable ? (
                  <Button
                    variant="ghost"
                    size="md"
                    disabled={pending}
                    onClick={() => refund(r.participantId, r.name)}
                  >
                    返金
                  </Button>
                ) : (
                  <span className="text-body-sm text-neutral-600">返金不可（当日以降）</span>
                )
              ) : (
                <span className="text-body-sm text-neutral-600">—</span>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </AppShell>
  );
}
