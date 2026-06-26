"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, Inbox, Download } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Th, Td } from "@/components/ui/Table";
import { MobileRecord } from "@/components/ui/MobileRecord";
import { yen } from "@/lib/format";
import type { AppRow, AppField } from "@/lib/queries/applications";
import { refundParticipant } from "./actions";

export function AdminApplicationsClient({
  rows,
  fieldsByEvent,
}: {
  rows: AppRow[];
  fieldsByEvent: Record<string, AppField[]>;
}) {
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

  // 回答項目の列見出し。イベントを1つ選んでいるときのみ表示（イベントごとに項目が異なるため）。
  const answerFields: AppField[] = eventId ? fieldsByEvent[eventId] ?? [] : [];

  const exportCsv = () => {
    const header = ["氏名", "部署", "イベント", "拠点", ...answerFields.map((f) => f.label), "状態", "金額"];
    const body = filtered.map((r) => [
      r.name,
      r.department,
      r.eventName,
      r.branchName,
      ...answerFields.map((f) => (r.values[f.id] ?? "").replace(/\n/g, " ")),
      r.status,
      String(r.amount),
    ]);
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
          variant="dangerOutline"
          size="sm"
          disabled={pending}
          onClick={() => refund(r.participantId, r.name)}
        >
          <RotateCcw size={15} />
          返金
        </Button>
      ) : (
        <span className="text-body-sm text-neutral-500">返金不可（当日以降）</span>
      )
    ) : null;

  return (
    <>
      <PageHeader
        title="申込一覧"
        description="イベント・拠点・状態で絞り込み。人単位の明細を表示します。"
      />

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      {/* 絞り込み：イベント選択の横に氏名・拠点・部署・状態を1行でまとめる。 */}
      <Card className="mb-4">
        {/* カード右上：条件をリセット */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-heading-sm text-neutral-900">絞り込み</h2>
          {(query || eventId || branchId || department || status) && (
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              <RotateCcw size={14} />
              条件をリセット
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-[2]">
            <label className="mb-1 block text-label-sm text-neutral-600">イベントを選択</label>
            <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">すべてのイベント</option>
              {events.map(([id, ev]) => (
                <option key={id} value={id}>
                  {ev.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-[180px] flex-1">
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
          <div className="w-32">
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
          <div className="w-36">
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
          <div className="w-32">
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
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <Download size={14} />
          CSV出力
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="該当する申込がありません"
          description="検索条件や絞り込みを変更してお試しください。"
        />
      ) : (
        <>
          {/* スマホ：カード表示（イベントを1つ選んでいるときは回答項目も表示） */}
          <div className="space-y-2 md:hidden">
            {filtered.map((r) => (
              <MobileRecord
                key={r.participantId}
                title={r.name}
                summary={yen(r.amount)}
                badge={<StatusBadge status={r.status} />}
                rows={[
                  ...(eventId === "" ? [{ label: "イベント", value: r.eventName }] : []),
                  { label: "拠点", value: r.branchName },
                  { label: "部署", value: r.department || "—" },
                  ...answerFields.map((f) => ({
                    label: f.label,
                    value: <span className="whitespace-pre-line">{r.values[f.id] || "—"}</span>,
                  })),
                ]}
                action={rowAction(r) ?? undefined}
              />
            ))}
          </div>

          {/* PC：テーブル表示（横スクロールさせず、回答項目を全て列表示・セルは折り返す） */}
          <div className="hidden md:block">
            <Table
              scroll={false}
              head={
                <tr>
                  <Th className="break-words">氏名</Th>
                  <Th className="break-words">部署</Th>
                  <Th className="break-words">拠点</Th>
                  {answerFields.map((f) => (
                    <Th key={f.id} className="whitespace-pre-line break-words">
                      {f.label}
                    </Th>
                  ))}
                  <Th className="break-words">金額</Th>
                  <Th className="break-words">状態</Th>
                  <Th className="break-words">操作</Th>
                </tr>
              }
            >
              {filtered.map((r) => (
                <tr key={r.participantId}>
                  <Td className="break-words">{r.name}</Td>
                  <Td className="break-words">
                    {r.department ? r.department : <span className="text-neutral-400">—</span>}
                  </Td>
                  <Td className="break-words">{r.branchName}</Td>
                  {answerFields.map((f) => (
                    <Td key={f.id} className="whitespace-pre-line break-words">
                      {r.values[f.id] || <span className="text-neutral-400">—</span>}
                    </Td>
                  ))}
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
    </>
  );
}
