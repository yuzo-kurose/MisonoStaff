"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { SectionCard } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Fieldset, Input, Select, MoneyInput } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { yen } from "@/lib/format";
import { branches } from "@/lib/mock/data";

/** 作成・編集で共通に使うイベント設定の入力値（サーバーアクションへ渡す形） */
export type EventFormPayload = {
  name: string;
  startDate: string;
  endDate: string;
  deadline: string;
  capacity: number | null;
  status: "draft" | "published";
  lodgingFee: number;
  outboundFare: number;
  inboundFare: number;
  outboundOptions: string[];
  inboundOptions: string[];
  existingBranchIds: string[];
  newBranchNames: string[];
};

/** フォームの初期表示値（入力欄に合わせ数値も文字列で保持） */
export type EventFormInitial = {
  name: string;
  startDate: string;
  endDate: string;
  deadline: string;
  capacity: string;
  status: "draft" | "published";
  lodging: string;
  outFare: string;
  inFare: string;
  outbound: string[];
  inbound: string[];
  selectedBranchIds: string[];
};

/** 新規作成時の初期値（作成・編集で同一UIにするための既定セット） */
export const newEventInitial: EventFormInitial = {
  name: "",
  startDate: "",
  endDate: "",
  deadline: "",
  capacity: "",
  status: "draft",
  lodging: "",
  outFare: "",
  inFare: "",
  outbound: ["往路守山バス（17時便）", "往路南草津バス（19時便）", "往路個人車"],
  inbound: ["復路守山バス", "復路個人車"],
  selectedBranchIds: branches.map((b) => b.id),
};

function defaultDeadline(endDate: string): string {
  if (!endDate) return "";
  const d = new Date(endDate);
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 25);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-25`;
}

function OptionEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <p className="text-label-md text-neutral-900">{label}</p>
      <div className="mt-2 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={it}
              aria-label={`${label}の選択肢 ${i + 1}`}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="md"
              aria-label="この選択肢を削除"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="md" onClick={() => onChange([...items, "新しい選択肢"])}>
          <Plus size={16} /> 選択肢を追加
        </Button>
      </div>
    </div>
  );
}

/**
 * イベント設定の入力フォーム本体。新規作成・編集で共有する。
 * 送信処理・遷移は親が onSubmit で受け取り（作成はフォーム編集へ、編集は一覧へ等）、
 * このコンポーネントは入力・バリデーション表示・pending 管理のみを担う。
 */
export function EventForm({
  initial,
  submitLabel,
  pendingLabel,
  actionNote,
  cancelHref,
  onSubmit,
}: {
  initial: EventFormInitial;
  submitLabel: string;
  pendingLabel: string;
  actionNote?: string;
  cancelHref: string;
  onSubmit: (payload: EventFormPayload) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState(initial.name);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [deadline, setDeadline] = useState(initial.deadline);
  const [deadlineTouched, setDeadlineTouched] = useState(Boolean(initial.deadline));
  const [capacity, setCapacity] = useState(initial.capacity);
  const [status, setStatus] = useState<"draft" | "published">(initial.status);

  const [lodging, setLodging] = useState(initial.lodging);
  const [outFare, setOutFare] = useState(initial.outFare);
  const [inFare, setInFare] = useState(initial.inFare);

  const [outbound, setOutbound] = useState<string[]>(initial.outbound);
  const [inbound, setInbound] = useState<string[]>(initial.inbound);

  const [selected, setSelected] = useState<Set<string>>(new Set(initial.selectedBranchIds));
  const [extraBranches, setExtraBranches] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const effectiveDeadline = deadlineTouched ? deadline : defaultDeadline(endDate);
  const maxFee = (Number(lodging) || 0) + (Number(outFare) || 0) + (Number(inFare) || 0);
  const allSelected = selected.size === branches.length;

  const toggleBranch = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(branches.map((b) => b.id)));

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
        lodgingFee: Number(lodging) || 0,
        outboundFare: Number(outFare) || 0,
        inboundFare: Number(inFare) || 0,
        outboundOptions: outbound,
        inboundOptions: inbound,
        existingBranchIds: [...selected],
        newBranchNames: extraBranches,
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
        className="mx-auto max-w-3xl space-y-6"
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

        <SectionCard
          step={2}
          title="料金"
          description="参加者が申込時に負担する金額。交通手段ごとの加算額は次のセクションで設定します。"
        >
          <div className="space-y-4">
            <Field label="スタッフ宿泊費" required>
              <MoneyInput value={lodging} onChange={(e) => setLodging(e.target.value)} placeholder="3000" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="往路バス代">
                <MoneyInput value={outFare} onChange={(e) => setOutFare(e.target.value)} placeholder="1000" />
              </Field>
              <Field label="復路バス代">
                <MoneyInput value={inFare} onChange={(e) => setInFare(e.target.value)} placeholder="1000" />
              </Field>
            </div>
            <div className="flex items-baseline justify-between rounded-lg bg-neutral-50 px-4 py-3">
              <span className="text-body-sm text-neutral-600">想定最大徴収額（宿泊＋往復バス）</span>
              <span className="text-heading-sm tabular-nums text-neutral-900">{yen(maxFee)}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          step={3}
          title="交通手段"
          description="参加者が申込時に選ぶ選択肢です。「バス」を含む選択肢にバス代が、それ以外は0円が設定されます。"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <OptionEditor label="往路" items={outbound} onChange={setOutbound} />
            <OptionEditor label="復路" items={inbound} onChange={setInbound} />
          </div>
        </SectionCard>

        <SectionCard
          step={4}
          title="対象拠点"
          description="申込を受け付ける拠点を選択します。一覧に無い拠点は下から追加できます。"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-body-sm text-neutral-600">
              {selected.size} / {branches.length} 拠点を選択中
            </span>
            <Button type="button" variant="ghost" size="md" onClick={toggleAll}>
              {allSelected ? "すべて解除" : "すべて選択"}
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => {
              const on = selected.has(b.id);
              return (
                <label
                  key={b.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-body-md transition-colors ${
                    on
                      ? "border-primary-700 bg-primary-50 text-neutral-900"
                      : "border-neutral-200 bg-neutral-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 flex-none"
                    checked={on}
                    onChange={() => toggleBranch(b.id)}
                  />
                  <span className="truncate">
                    {b.name}
                    <span className="ml-1 text-body-sm text-neutral-600">（{b.region}）</span>
                  </span>
                </label>
              );
            })}
          </div>

          {extraBranches.length > 0 && (
            <div className="mt-3 space-y-2">
              {extraBranches.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={b}
                    placeholder="新しい拠点名"
                    aria-label={`追加する拠点 ${i + 1}`}
                    onChange={(e) => {
                      const next = [...extraBranches];
                      next[i] = e.target.value;
                      setExtraBranches(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    aria-label="この拠点を削除"
                    onClick={() => setExtraBranches(extraBranches.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setExtraBranches([...extraBranches, ""])}
            >
              <Plus size={16} /> 拠点を追加
            </Button>
          </div>
        </SectionCard>

        <SectionCard step={5} title="公開設定">
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

        <StickyActionBar left={actionNote ? <span>{actionNote}</span> : undefined}>
          <ButtonLink href={cancelHref} variant="secondary" size="lg">
            キャンセル
          </ButtonLink>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
            {!pending && <ArrowRight size={18} />}
          </Button>
        </StickyActionBar>
      </form>
    </>
  );
}
