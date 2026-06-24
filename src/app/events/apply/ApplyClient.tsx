"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { Badge } from "@/components/ui/Badge";
import { yen, jpDate } from "@/lib/format";
import {
  submitApplication,
  requestChange,
  type ApplyInput,
  type ExistingApplication,
} from "./actions";

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
  branches,
  defaultBranchId,
  divisions,
  defaultDivision,
  existing,
}: {
  events: ApplyEvent[];
  profileName: string;
  branches: { id: string; name: string }[];
  defaultBranchId: string;
  divisions: { value: string; label: string }[];
  defaultDivision: string;
  existing: Record<string, ExistingApplication>;
}) {
  const router = useRouter();
  const k = (eid: string, fid: string) => `${eid}:${fid}`;

  // 既存申込の入力値をフォーム初期値にプリフィルする。
  const initial = () => {
    const t: Record<string, string> = {};
    const s: Record<string, string> = {};
    const m: Record<string, string[]> = {};
    for (const e of events) {
      const ex = existing[e.id];
      if (!ex) continue;
      for (const f of e.fields) {
        const v = ex.values[f.id];
        if (!v) continue;
        const key = k(e.id, f.id);
        if (f.fieldType === "select_multiple") m[key] = v.optionIds;
        else if (f.fieldType === "select_single") s[key] = v.optionIds[0] ?? "";
        else t[key] = v.value ?? "";
      }
    }
    return { t, s, m };
  };
  const seed = initial();

  // key = `${eventId}:${fieldId}`
  const [text, setText] = useState<Record<string, string>>(seed.t);
  const [single, setSingle] = useState<Record<string, string>>(seed.s);
  const [multi, setMulti] = useState<Record<string, string[]>>(seed.m);
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [division, setDivision] = useState(defaultDivision);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 確定済み(編集不可)のイベント：本人は代表者へ依頼する。
  const locked = (eid: string) => {
    const st = existing[eid]?.status;
    return st === "confirmed" || st === "paid";
  };

  const sendRequest = (eid: string, type: "edit" | "cancel") => {
    const ex = existing[eid];
    if (!ex) return;
    const label = type === "edit" ? "編集" : "キャンセル";
    const message = window.prompt(`代表者への${label}依頼の内容（任意）を入力してください。`, "");
    if (message === null) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await requestChange(ex.participantId, type, message);
      setNotice(res.ok ? `${label}依頼を送信しました。代表者の対応をお待ちください。` : null);
      if (!res.ok) setError(`${label}依頼の送信に失敗：${res.error}`);
    });
  };

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
    if (!branchId) {
      setError("所属（拠点）を選択してください。");
      return;
    }
    if (!division) {
      setError("部を選択してください。");
      return;
    }
    const input: ApplyInput = {
      branchId,
      division,
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
    <>
      <PageHeader
        title="申込内容の入力"
        description="選択した複数イベントの内容をまとめて入力します。"
      />

      <Card className="mb-6">
        <CardTitle>申込者情報</CardTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1 text-label-sm text-neutral-600">氏名</p>
            <p className="py-2.5 text-body-md text-neutral-900">{profileName}</p>
          </div>
          <Field label="所属（拠点）" required>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
              <option value="" disabled>
                選択してください
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="部" required>
            <Select value={division} onChange={(e) => setDivision(e.target.value)} required>
              <option value="" disabled>
                選択してください
              </option>
              {divisions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}

      <div className="space-y-6">
        {events.map((e) => {
          const ex = existing[e.id];
          const isLocked = locked(e.id);
          return (
          <Card key={e.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle>{e.name}</CardTitle>
                {ex?.status === "applying" && <Badge variant="warning">申込中（編集できます）</Badge>}
                {isLocked && <Badge variant="success">確定済み</Badge>}
              </div>
              <span className="text-body-sm text-neutral-600">{jpDate(e.eventDate)}</span>
            </div>
            {isLocked && (
              <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-body-sm text-neutral-600">
                確定済みのため直接編集できません。変更・取消は下のボタンから代表者へ依頼してください。
              </p>
            )}
            <fieldset disabled={isLocked} className="mt-4 space-y-4 disabled:opacity-70">
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
            </fieldset>
            {isLocked ? (
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={pending}
                  onClick={() => sendRequest(e.id, "edit")}
                >
                  代表者に編集を依頼
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={pending}
                  onClick={() => sendRequest(e.id, "cancel")}
                  className="text-error-900"
                >
                  キャンセルを依頼
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-right text-label-lg text-neutral-900">
                小計：{yen(eventTotal(e))}
              </p>
            )}
          </Card>
          );
        })}
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
    </>
  );
}
