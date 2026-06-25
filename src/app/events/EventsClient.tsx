"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, MapPin, Users, Clock, CalendarX, Ticket } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { yen } from "@/lib/format";

export type EventListItem = {
  id: string;
  name: string;
  eventDate: string;
  startDate: string | null;
  venue: string | null;
  deadline: string;
  capacity: number | null;
  fee: number;
  category: string;
};

const WD = ["日", "月", "火", "水", "木", "金", "土"];
const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d: string) =>
  Math.round((new Date(d).getTime() - new Date(today()).getTime()) / 86400000);
const md = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${d}`;
};
const weekday = (iso: string) => `${WD[new Date(iso).getDay()]}曜日`;
const fullDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${y}/${m}/${d}（${WD[new Date(iso).getDay()]}）`;
};

type Tab = "upcoming" | "past";
type Sort = "date" | "deadline";

export function EventsClient({
  events,
  appliedStatus = {},
}: {
  events: EventListItem[];
  appliedStatus?: Record<string, string>;
}) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("date");
  const [filterOpen, setFilterOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  const t = today();
  const counts = useMemo(
    () => ({
      upcoming: events.filter((e) => e.eventDate >= t).length,
      past: events.filter((e) => e.eventDate < t).length,
    }),
    [events, t],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const r = events.filter((e) => {
      if (tab === "upcoming" ? e.eventDate < t : e.eventDate >= t) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (fromDate && e.eventDate < fromDate) return false;
      if (toDate && e.eventDate > toDate) return false;
      if (openOnly && e.deadline < t) return false;
      return true;
    });
    r.sort((a, b) =>
      sort === "deadline"
        ? a.deadline.localeCompare(b.deadline)
        : a.eventDate.localeCompare(b.eventDate),
    );
    return r;
  }, [events, tab, query, fromDate, toDate, openOnly, sort, t]);

  const TabBtn = ({ id, label, n }: { id: Tab; label: string; n: number }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`relative px-1 pb-3 text-body-md transition-colors ${
        tab === id ? "font-semibold text-primary-900" : "text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {label}（{n}）
      {tab === id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-700" />}
    </button>
  );

  return (
    <>
      <PageHeader
        title="イベント一覧"
        description="参加したいイベントを選んで、詳細の確認や申し込みができます。"
      />

      {/* タブ */}
      <div className="mb-5 flex gap-6 border-b border-neutral-200">
        <TabBtn id="upcoming" label="開催予定" n={counts.upcoming} />
        <TabBtn id="past" label="過去イベント" n={counts.past} />
      </div>

      {/* 検索・絞り込み・並び替え */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="イベント名で検索"
            className="pl-10"
            aria-label="イベント名で検索"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          className={`flex flex-none items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-body-md transition-colors ${
            filterOpen || fromDate || toDate || openOnly
              ? "border-primary-300 bg-primary-50 text-primary-900"
              : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          <SlidersHorizontal size={16} /> 絞り込み
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="flex-none rounded-lg border border-neutral-200 px-3 py-2.5 text-body-md text-neutral-700"
          aria-label="並び替え"
        >
          <option value="date">開催日が近い順</option>
          <option value="deadline">締切が近い順</option>
        </select>
      </div>

      {/* 絞り込みパネル */}
      {filterOpen && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-white p-4 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-label-sm text-neutral-600">開催日（期間）</label>
            <div className="flex items-center gap-2">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="sm:w-40" />
              <span className="text-neutral-500">〜</span>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="sm:w-40" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-body-sm text-neutral-700 sm:pb-2.5">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-400 text-primary-700"
            />
            受付中のみ
          </label>
          <button
            type="button"
            onClick={() => { setFromDate(""); setToDate(""); setOpenOnly(false); }}
            className="text-body-sm text-primary-900 hover:underline sm:ml-auto sm:pb-2.5"
          >
            条件をリセット
          </button>
        </div>
      )}

      {/* 一覧 */}
      {list.length === 0 ? (
        <EmptyState
          icon={tab === "past" ? CalendarX : Search}
          title={tab === "past" ? "過去のイベントはありません" : "条件に一致するイベントがありません"}
          description="検索条件やタブを切り替えてお試しください。"
        />
      ) : (
        <div className="space-y-3">
          {list.map((e) => {
            const left = daysUntil(e.deadline);
            const closed = left < 0;
            const applied = Boolean(appliedStatus[e.id]);
            return (
              <div
                key={e.id}
                className="flex w-full items-stretch gap-3 rounded-xl border border-neutral-200 bg-neutral-white p-3 text-left shadow-sm sm:gap-4"
              >
                {/* サムネイル */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/syuugou.jpeg"
                  alt=""
                  className="h-20 w-24 flex-none rounded-lg object-cover sm:h-28 sm:w-44"
                />

                {/* 日付ブロック */}
                <div className="flex w-14 flex-none flex-col items-center justify-center sm:w-20">
                  <span className="text-heading-lg font-bold leading-none text-neutral-900 sm:text-[1.75rem]">
                    {md(e.eventDate)}
                  </span>
                  <span className="mt-1 text-label-sm text-neutral-500">{weekday(e.eventDate)}</span>
                </div>

                {/* 内容 */}
                <div className="min-w-0 flex-1">
                  <Badge variant="info">{e.category}</Badge>
                  <p className="mt-1 truncate text-heading-sm text-neutral-900">{e.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-neutral-600">
                    {e.venue && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} className="text-neutral-400" /> {e.venue}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Users size={14} className="text-neutral-400" /> 定員 {e.capacity ?? "—"}名
                    </span>
                    <span className="hidden items-center gap-1 sm:inline-flex">
                      <Clock size={14} className="text-neutral-400" /> 開催日 {fullDate(e.eventDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Ticket size={14} className="text-neutral-400" /> 参加費 {e.fee > 0 ? yen(e.fee) : "無料"}
                    </span>
                  </div>
                  <span
                    className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-label-sm font-medium ${
                      closed
                        ? "bg-neutral-100 text-neutral-500"
                        : left <= 3
                          ? "bg-error-100 text-error-900"
                          : "bg-error-50 text-error-900"
                    }`}
                  >
                    {closed ? "締切" : left === 0 ? "本日締切" : `締切まであと${left}日`}
                  </span>
                </div>

                {/* 操作：申込済みは申込ボタン非活性＋修正ボタン。未申込は申込ボタン（締切後は非活性）。 */}
                <div className="flex flex-none flex-col items-stretch justify-center gap-2">
                  {applied ? (
                    <>
                      <Button size="md" disabled>
                        申込済み
                      </Button>
                      <ButtonLink href={`/events/apply?ids=${e.id}`} variant="secondary" size="md">
                        修正
                      </ButtonLink>
                    </>
                  ) : closed ? (
                    <Button size="md" disabled>
                      締切
                    </Button>
                  ) : (
                    <ButtonLink href={`/events/apply?ids=${e.id}`} size="md">
                      申込
                    </ButtonLink>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
