"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Fieldset, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { StickyActionBar } from "@/components/ui/StickyActionBar";

/** 作成・編集で共通に使うイベント設定の入力値（サーバーアクションへ渡す形） */
export type EventFormPayload = {
  name: string;
  startDate: string;
  endDate: string;
  deadline: string;
  capacity: number | null;
  status: "draft" | "published";
};

/** フォームの初期表示値（入力欄に合わせ数値も文字列で保持） */
export type EventFormInitial = {
  name: string;
  startDate: string;
  endDate: string;
  deadline: string;
  capacity: string;
  status: "draft" | "published";
};

/** 新規作成時の初期値 */
export const newEventInitial: EventFormInitial = {
  name: "",
  startDate: "",
  endDate: "",
  deadline: "",
  capacity: "",
  status: "draft",
};

function defaultDeadline(endDate: string): string {
  if (!endDate) return "";
  const d = new Date(endDate);
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 25);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-25`;
}

/**
 * イベントの基本情報を入力するフォーム。新規作成・編集で共有する。
 * 料金・交通手段・拠点などの明細は申込フォーム（/admin/forms/[eventId]）で項目として作成する。
 */
export function EventForm({
  initial,
  submitLabel,
  pendingLabel,
  actionNote,
  cancelHref,
  onSubmit,
  embedded = false,
}: {
  initial: EventFormInitial;
  submitLabel: string;
  pendingLabel: string;
  actionNote?: string;
  cancelHref: string;
  onSubmit: (payload: EventFormPayload) => Promise<{ ok: boolean; error?: string }>;
  // 編集ページ等に埋め込む場合は固定の操作バーを使わずインライン保存にする。
  embedded?: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [deadline, setDeadline] = useState(initial.deadline);
  const [deadlineTouched, setDeadlineTouched] = useState(Boolean(initial.deadline));
  const [capacity, setCapacity] = useState(initial.capacity);
  const [status, setStatus] = useState<"draft" | "published">(initial.status);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const effectiveDeadline = deadlineTouched ? deadline : defaultDeadline(endDate);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await onSubmit({
        name,
        startDate,
        endDate,
        deadline: effectiveDeadline,
        capacity: capacity ? Number(capacity) : null,
        status,
      });
      if (!res.ok) setError(res.error ?? "保存に失敗しました。");
    });
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form
        className={`${embedded ? "" : "mx-auto"} max-w-3xl space-y-6`}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <SectionCard step={1} title="基本情報">
          <div className="space-y-4">
            <Field label="イベント名" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="元旦祭 奉仕" />
            </Field>
            <Fieldset label="開催期間" required hint="受付日（土）〜 当日（日）">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  aria-label="開催初日"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="flex-none text-neutral-600">〜</span>
                <Input
                  type="date"
                  aria-label="開催当日"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </Fieldset>
            <Field label="申込締切" required hint="デフォルト：開催前月の25日">
              <Input
                type="date"
                value={effectiveDeadline}
                onChange={(e) => {
                  setDeadlineTouched(true);
                  setDeadline(e.target.value);
                }}
              />
            </Field>
            <Field label="定員" hint="未設定で無制限">
              <Input
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="300"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard step={2} title="公開設定">
          <Field label="状態" hint="下書きは管理者のみ閲覧可。公開すると参加者の申込が始まります。">
            <Select
              className="max-w-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "published")}
            >
              <option value="draft">下書き（非公開）</option>
              <option value="published">公開する</option>
            </Select>
          </Field>
        </SectionCard>

        {embedded ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4">
            {actionNote && <span className="text-body-sm text-neutral-600">{actionNote}</span>}
            <Button type="submit" size="md" disabled={pending} className="ml-auto">
              {pending ? pendingLabel : submitLabel}
            </Button>
          </div>
        ) : (
          <StickyActionBar left={actionNote ? <span>{actionNote}</span> : undefined}>
            <ButtonLink href={cancelHref} variant="secondary" size="lg">
              キャンセル
            </ButtonLink>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? pendingLabel : submitLabel}
              {!pending && <ArrowRight size={18} />}
            </Button>
          </StickyActionBar>
        )}
      </form>
    </>
  );
}
