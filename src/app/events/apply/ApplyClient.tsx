"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { yen, jpDate } from "@/lib/format";
import { submitApplication, type ApplyInput } from "./actions";

export type ApplyField = {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  priceCalc: "none" | "per_unit" | "option_based";
  unitPrice?: number;
  options: { id: string; label: string; price?: number }[];
};
export type ApplyEvent = {
  id: string;
  name: string;
  eventDate: string;
  venue: string | null;
  fields: ApplyField[];
};

const isSelect = (t: string) => t === "select_single" || t === "select_multiple";

export function ApplyClient({
  events,
  profileName,
  branchName,
}: {
  events: ApplyEvent[];
  profileName: string;
  branchName: string;
}) {
  const router = useRouter();
  // key = `${eventId}:${fieldId}`
  const [text, setText] = useState<Record<string, string>>({});
  const [single, setSingle] = useState<Record<string, string>>({});
  const [multi, setMulti] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const k = (eid: string, fid: string) => `${eid}:${fid}`;

  const fieldAmount = (eid: string, f: ApplyField): number => {
    const key = k(eid, f.id);
    if (f.priceCalc === "per_unit") return (Number(text[key]) || 0) * (f.unitPrice ?? 0);
    if (f.priceCalc === "option_based") {
      const ids = f.fieldType === "select_multiple" ? (multi[key] ?? []) : single[key] ? [single[key]] : [];
      return ids.reduce((s, id) => s + (f.options.find((o) => o.id === id)?.price ?? 0), 0);
    }
    return 0;
  };
  const eventTotal = (e: ApplyEvent) => e.fields.reduce((s, f) => s + fieldAmount(e.id, f), 0);
  const grandTotal = events.reduce((s, e) => s + eventTotal(e), 0);

  const toggleMulti = (key: string, id: string) =>
    setMulti((m) => {
      const cur = m[key] ?? [];
      return { ...m, [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });

  const onSubmit = () => {
    setError(null);
    const input: ApplyInput = {
      events: events.map((e) => ({
        eventId: e.id,
        values: e.fields.map((f) => {
          const key = k(e.id, f.id);
          if (f.fieldType === "select_multiple") {
            return { fieldId: f.id, value: null, optionIds: multi[key] ?? [] };
          }
          if (f.fieldType === "select_single") {
            return { fieldId: f.id, value: null, optionIds: single[key] ? [single[key]] : [] };
          }
          return { fieldId: f.id, value: text[key] ?? null, optionIds: [] };
        }),
      })),
    };
    startTransition(async () => {
      const res = await submitApplication(input);
      if (!res.ok) {
        setError(res.error ?? "申込に失敗しました。");
        return;
      }
      router.push("/mypage");
      router.refresh();
    });
  };

  return (
    <AppShell role="participant">
      <PageHeader
        title="申込内容の入力"
        description="選択した複数イベントの内容をまとめて入力します。"
      />

      <Card className="mb-6">
        <CardTitle>申込者情報（登録済み）</CardTitle>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-body-md">
          <dt className="text-neutral-600">氏名</dt>
          <dd className="text-neutral-900">{profileName}</dd>
          <dt className="text-neutral-600">所属拠点</dt>
          <dd className="text-neutral-900">{branchName}</dd>
        </dl>
      </Card>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="space-y-6">
        {events.map((e) => (
          <Card key={e.id}>
            <div className="flex items-center justify-between">
              <CardTitle>{e.name}</CardTitle>
              <span className="text-body-sm text-neutral-600">{jpDate(e.eventDate)}</span>
            </div>
            <div className="mt-4 space-y-4">
              {e.fields.map((f) => {
                const key = k(e.id, f.id);
                if (f.fieldType === "number") {
                  return (
                    <Field
                      key={f.id}
                      label={`${f.label}${f.unitPrice ? `（${yen(f.unitPrice)}/単位）` : ""}`}
                      required={f.required}
                    >
                      <Input
                        type="number"
                        min={0}
                        value={text[key] ?? ""}
                        onChange={(ev) => setText((t) => ({ ...t, [key]: ev.target.value }))}
                      />
                    </Field>
                  );
                }
                if (f.fieldType === "textarea") {
                  return (
                    <Field key={f.id} label={f.label} required={f.required}>
                      <Textarea
                        value={text[key] ?? ""}
                        onChange={(ev) => setText((t) => ({ ...t, [key]: ev.target.value }))}
                      />
                    </Field>
                  );
                }
                if (f.fieldType === "date") {
                  return (
                    <Field key={f.id} label={f.label} required={f.required}>
                      <Input
                        type="date"
                        value={text[key] ?? ""}
                        onChange={(ev) => setText((t) => ({ ...t, [key]: ev.target.value }))}
                      />
                    </Field>
                  );
                }
                if (f.fieldType === "select_multiple") {
                  return (
                    <Field key={f.id} label={f.label} required={f.required}>
                      <div className="space-y-1.5">
                        {f.options.map((o) => (
                          <label key={o.id} className="flex items-center gap-2 text-body-md">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={(multi[key] ?? []).includes(o.id)}
                              onChange={() => toggleMulti(key, o.id)}
                            />
                            {o.label}
                            {o.price ? `（+${yen(o.price)}）` : ""}
                          </label>
                        ))}
                      </div>
                    </Field>
                  );
                }
                // text / select_single
                if (isSelect(f.fieldType)) {
                  return (
                    <Field key={f.id} label={f.label} required={f.required}>
                      <Select
                        value={single[key] ?? ""}
                        onChange={(ev) => setSingle((s) => ({ ...s, [key]: ev.target.value }))}
                      >
                        <option value="">選択してください</option>
                        {f.options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                            {o.price ? `（+${yen(o.price)}）` : ""}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  );
                }
                return (
                  <Field key={f.id} label={f.label} required={f.required}>
                    <Input
                      value={text[key] ?? ""}
                      onChange={(ev) => setText((t) => ({ ...t, [key]: ev.target.value }))}
                    />
                  </Field>
                );
              })}
            </div>
            <p className="mt-4 text-right text-label-lg text-neutral-900">
              小計：{yen(eventTotal(e))}
            </p>
          </Card>
        ))}
      </div>

      <StickyActionBar
        left={
          <span>
            合計（{events.length}件）{" "}
            <span className="text-heading-sm text-primary-900">{yen(grandTotal)}</span>
          </span>
        }
      >
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={pending}
          onClick={() => router.push("/events")}
        >
          キャンセル
        </Button>
        <Button size="lg" disabled={pending} onClick={onSubmit}>
          {pending ? "送信中…" : "この内容で申し込む"}
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
