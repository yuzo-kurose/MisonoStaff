"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle2, Coins, XCircle, Search, RotateCcw, Inbox } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Th, Td } from "@/components/ui/Table";
import { MobileRecord } from "@/components/ui/MobileRecord";
import { yen, jpDate } from "@/lib/format";
import type { AppRow } from "@/lib/queries/applications";
import { refundParticipant } from "./actions";

export function AdminApplicationsClient({ rows }: { rows: AppRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // 既定で最初（日付が近い）のイベントを選択＝イベント単位で表示する。
  const [eventId, setEventId] = useState(
    () => rows.slice().sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0]?.eventId ?? "",
  );
  const [branchId, setBranchId] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const resetFilters = () => {
    setQuery("");
    setEventId("");
    setBranchId("");
    setDepartment("");
    setStatus("");
  };

  const events = useMemo(() => {
    const m = new Map<string, { name: string; date: string }>();
    for (const r of rows) if (!m.has(r.eventId)) m.set(r.eventId, { name: r.eventName, date: r.eventDate });
    return [...m.entries()].sort((a, b) => a[1].date.localeCompare(b[1].date));
  }, [rows]);
  // 選択イベントの行（集計カード用）。未選択（すべて）なら全件。
  const eventRows = useMemo(
    () => (eventId ? rows.filter((r) => r.eventId === eventId) : rows),
    [rows, eventId],
  );
  const branches = useMemo(
    () => [...new Map(rows.map((r) => [r.branchId, r.branchName])).entries()],
    [rows],
  );
  const departments = useMemo(
    () => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(),
    [rows],
  );

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (q === "" || r.name.toLowerCase().includes(q)) &&
      (eventId === "" || r.eventId === eventId) &&
      (branchId === "" || r.branchId === branchId) &&
      (department === "" || r.department === department) &&
      (status === "" || r.status === status),
  );
  const paidTotal = filtered
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);

  const exportCsv = () => {
    const header = ["氏名", "部署", "イベント", "拠点", "状態", "金額"];
    const body = filtered.map((r) => [r.name, r.department, r.eventName, r.branchName, r.status, String(r.amount)]);
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

  // 1行の操作（返金）。表・スマホカードで共用。
  const rowAction = (r: AppRow) =>
    r.status === "paid" ? (
      r.refundable ? (
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => refund(r.participantId, r.name)}
          className="text-error-900 hover:bg-error-100"
        >
          <RotateCcw size={15} />
          返金
        </Button>
      ) : (
        <span className="text-body-sm text-neutral-500">返金不可（当日以降）</span>
      )
    ) : null;

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

      {/* 上部：イベント選択。選んだイベント単位で集計カードと一覧を表示する。 */}
      <Card className="mb-4">
        <label className="mb-1 block text-label-sm text-neutral-600">イベントを選択</label>
        <Select value={eventId} onChange={(e) => setEventId(e.target.value)} className="max-w-md">
          <option value="">すべてのイベント</option>
          {events.map(([id, ev]) => (
            <option key={id} value={id}>
              {ev.name}（{jpDate(ev.date)}）
            </option>
          ))}
        </Select>
      </Card>

      <StatGrid>
        <StatCard icon={Users} label="申込総数" value={eventRows.length} variant="primary" />
        <StatCard
          icon={CheckCircle2}
          label="支払済"
          value={eventRows.filter((r) => r.status === "paid").length}
          variant="success"
        />
        <StatCard
          icon={Coins}
          label="売上"
          value={yen(eventRows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0))}
          variant="warning"
        />
        <StatCard
          icon={XCircle}
          label="キャンセル"
          value={eventRows.filter((r) => r.status === "cancelled").length}
          variant="neutral"
        />
      </StatGrid>

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-label-sm text-neutral-600">氏名で検索</label>
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="氏名"
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-40">
            <label className="mb-1 block text-label-sm text-neutral-600">拠点</label>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">すべて</option>
              {branches.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <label className="mb-1 block text-label-sm text-neutral-600">部署</label>
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">すべて</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <label className="mb-1 block text-label-sm text-neutral-600">状態</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">すべて</option>
              <option value="applying">申込中</option>
              <option value="confirmed">確定</option>
              <option value="paid">支払済</option>
              <option value="cancelled">キャンセル</option>
            </Select>
          </div>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-body-sm text-neutral-700">
          <span className="font-medium text-neutral-900">{filtered.length}</span>件 / 支払済合計{" "}
          <span className="text-label-lg font-medium text-primary-900">{yen(paidTotal)}</span>
        </p>
        {(query || eventId || branchId || department || status) && (
          <Button variant="ghost" onClick={resetFilters}>
            条件をリセット
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="該当する申込がありません"
          description="検索条件や絞り込みを変更してお試しください。"
        />
      ) : (
        <>
          {/* スマホ：カード表示 */}
          <div className="space-y-2 md:hidden">
            {filtered.map((r) => (
              <MobileRecord
                key={r.participantId}
                title={r.name}
                badge={<StatusBadge status={r.status} />}
                rows={[
                  { label: "イベント", value: r.eventName },
                  { label: "拠点", value: r.branchName },
                  { label: "部署", value: r.department || "—" },
                  { label: "金額", value: <span className="tabular-nums">{yen(r.amount)}</span> },
                ]}
                action={rowAction(r) ?? undefined}
              />
            ))}
          </div>

          {/* PC：テーブル表示 */}
          <div className="hidden md:block">
            <Table
              head={
                <tr>
                  <Th>氏名</Th>
                  <Th>部署</Th>
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
                  <Td>{r.department ? r.department : <span className="text-neutral-400">—</span>}</Td>
                  <Td>{r.eventName}</Td>
                  <Td>{r.branchName}</Td>
                  <Td>
                    <span className="tabular-nums">{yen(r.amount)}</span>
                  </Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td>{rowAction(r) ?? <span className="text-neutral-400">—</span>}</Td>
                </tr>
              ))}
            </Table>
          </div>
        </>
      )}
    </AppShell>
  );
}
