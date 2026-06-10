"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { jpDate } from "@/lib/format";

export type EventListItem = {
  id: string;
  name: string;
  eventDate: string;
  venue: string | null;
  deadline: string;
  capacity: number | null;
};

export function EventsClient({ events }: { events: EventListItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const byDate = useMemo(() => {
    const map = new Map<string, EventListItem[]>();
    for (const e of events) {
      const arr = map.get(e.eventDate) ?? [];
      arr.push(e);
      map.set(e.eventDate, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <AppShell role="participant">
      <PageHeader
        title="イベントに申し込む"
        description="複数のイベントをまとめて選択できます。同日開催はまとめて表示しています。"
      />

      {events.length === 0 && (
        <Alert variant="info">現在申込受付中のイベントはありません。</Alert>
      )}

      <div className="space-y-8 pb-28">
        {byDate.map(([date, list]) => (
          <section key={date}>
            <h2 className="mb-3 text-heading-md text-neutral-900">{jpDate(date)}</h2>
            <div className="grid gap-3">
              {list.map((e) => {
                const checked = selected.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggle(e.id)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                      checked
                        ? "border-primary-700 bg-primary-50"
                        : "border-neutral-200 bg-neutral-white hover:bg-neutral-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border ${
                        checked
                          ? "border-primary-900 bg-primary-900 text-neutral-white"
                          : "border-neutral-500 bg-neutral-white"
                      }`}
                      aria-hidden
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="flex-1">
                      <span className="text-body-lg text-neutral-900">{e.name}</span>
                      <span className="mt-1 block text-body-sm text-neutral-600">
                        申込締切 {jpDate(e.deadline)}・定員 {e.capacity ?? "—"}名
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-neutral-white md:left-60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <p className="text-body-sm text-neutral-700">
            <span className="text-heading-sm text-neutral-900">{selected.length}</span> 件選択中
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
    </AppShell>
  );
}
