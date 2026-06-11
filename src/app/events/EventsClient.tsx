"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CalendarDays, Clock, Users, CalendarX, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { jpDate } from "@/lib/format";

export type EventListItem = {
  id: string;
  name: string;
  eventDate: string;
  venue: string | null;
  deadline: string;
  capacity: number | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d: string) =>
  Math.round((new Date(d).getTime() - new Date(today()).getTime()) / 86400000);

export function EventsClient({ events }: { events: EventListItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  // 開催日の範囲（日付入力の min/max 用）
  const dateRange = useMemo(() => {
    const ds = events.map((e) => e.eventDate).sort((a, b) => a.localeCompare(b));
    return { min: ds[0] ?? "", max: ds[ds.length - 1] ?? "" };
  }, [events]);

  // 検索（イベント名）＋期間（開催日 from〜to）＋受付中のみ で絞り込み
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const t = today();
    return events.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (fromDate && e.eventDate < fromDate) return false;
      if (toDate && e.eventDate > toDate) return false;
      if (openOnly && e.deadline < t) return false;
      return true;
    });
  }, [events, query, fromDate, toDate, openOnly]);

  const byDate = useMemo(() => {
    const map = new Map<string, EventListItem[]>();
    for (const e of filtered) {
      const arr = map.get(e.eventDate) ?? [];
      arr.push(e);
      map.set(e.eventDate, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <AppShell role="participant">
      <PageHeader
        title="イベントに申し込む"
        description="複数のイベントをまとめて選択できます。同日開催はまとめて表示しています。"
      />

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="現在申込受付中のイベントはありません"
          description="新しいイベントが公開されるとここに表示されます。連絡事項もあわせてご確認ください。"
        />
      ) : (
        <>
          {/* 検索・絞り込み */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="イベント名で検索"
                className="pl-10"
                aria-label="イベント名で検索"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                min={dateRange.min}
                max={toDate || dateRange.max}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="開催日の開始"
                className="sm:w-40"
              />
              <span className="flex-none text-neutral-500">〜</span>
              <Input
                type="date"
                value={toDate}
                min={fromDate || dateRange.min}
                max={dateRange.max}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="開催日の終了"
                className="sm:w-40"
              />
            </div>
            <label className="flex flex-none items-center gap-2 text-body-sm text-neutral-700">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-400 text-primary-700"
              />
              受付中のみ
            </label>
          </div>

          {byDate.length === 0 ? (
            <EmptyState
              icon={Search}
              title="条件に一致するイベントがありません"
              description="検索条件や日程の絞り込みを変更してお試しください。"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setFromDate("");
                    setToDate("");
                    setOpenOnly(false);
                  }}
                >
                  条件をリセット
                </Button>
              }
            />
          ) : (
            <div className="space-y-8 pb-28">
          {byDate.map(([date, list]) => (
            <section key={date}>
              <div className="mb-3 flex items-center gap-2.5">
                <span className="h-6 w-1.5 rounded-full bg-primary-700" />
                <h2 className="flex items-center gap-2 text-heading-md text-neutral-900">
                  <CalendarDays size={18} className="text-primary-700" />
                  {jpDate(date)}
                </h2>
              </div>
              <div className="grid gap-3">
                {list.map((e) => {
                  const checked = selected.includes(e.id);
                  const left = daysUntil(e.deadline);
                  const closed = left < 0;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggle(e.id)}
                      aria-pressed={checked}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md ${
                        checked
                          ? "border-primary-700 bg-primary-50 ring-1 ring-primary-700"
                          : "border-neutral-200 bg-neutral-white hover:border-neutral-300"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded border transition-colors ${
                          checked
                            ? "border-primary-900 bg-primary-900 text-neutral-white"
                            : "border-neutral-400 bg-neutral-white"
                        }`}
                        aria-hidden
                      >
                        {checked && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className="flex-1">
                        <span className="block text-body-lg font-medium text-neutral-900">
                          {e.name}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-neutral-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={14} className="text-neutral-400" />
                            申込締切 {jpDate(e.deadline)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users size={14} className="text-neutral-400" />
                            定員 {e.capacity ?? "—"}名
                          </span>
                        </span>
                      </span>
                      <span
                        className={`flex-none rounded-full px-2.5 py-0.5 text-label-sm font-medium ${
                          closed
                            ? "bg-neutral-100 text-neutral-500"
                            : left <= 3
                              ? "bg-error-100 text-error-900"
                              : "bg-info-100 text-info-900"
                        }`}
                      >
                        {closed ? "締切" : left === 0 ? "本日締切" : `締切まであと${left}日`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
            </div>
          )}
        </>
      )}

      {events.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-neutral-white/95 backdrop-blur md:left-60">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
            <p className="text-body-sm text-neutral-700">
              <span className="text-heading-sm text-primary-900">{selected.length}</span> 件選択中
            </p>
            <Button
              size="lg"
              disabled={selected.length === 0}
              onClick={() => router.push(`/events/apply?ids=${selected.join(",")}`)}
            >
              申込内容を入力する
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
