"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { toast } from "@/components/ui/toast";
import { updateParticipantValues, type ParticipantEdit } from "../../actions";

type Cell = { value: string; optionIds: string[] };

export function RepEditClient({ data }: { data: ParticipantEdit }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, Cell>>(() => {
    const init: Record<string, Cell> = {};
    for (const f of data.fields) {
      const v = data.values[f.id];
      init[f.id] = { value: v?.value ?? "", optionIds: v?.optionIds ?? [] };
    }
    return init;
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const cell = (id: string): Cell => values[id] ?? { value: "", optionIds: [] };
  const setVal = (id: string, patch: Partial<Cell>) =>
    setValues((s) => ({ ...s, [id]: { ...cell(id), ...patch } }));
  const toggleOpt = (id: string, optId: string) =>
    setValues((s) => {
      const cur = cell(id).optionIds;
      const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId];
      return { ...s, [id]: { ...cell(id), optionIds: next } };
    });

  const onSave = () => {
    setMsg(null);
    startTransition(async () => {
      const payload = data.fields.map((f) => {
        const c = cell(f.id);
        return { fieldId: f.id, value: c.value || null, optionIds: c.optionIds };
      });
      const res = await updateParticipantValues(data.participantId, payload);
      if (res.ok) {
        toast("申込内容を保存しました。");
        router.push("/rep/roster");
        router.refresh();
      } else {
        setMsg({ ok: false, text: `保存に失敗：${res.error}` });
        toast(`保存に失敗：${res.error}`, "error");
      }
    });
  };

  const fieldInput = (f: ParticipantEdit["fields"][number]) => {
    const c = cell(f.id);
    if (f.fieldType === "select_single") {
      return (
        <Select
          value={c.optionIds[0] ?? ""}
          onChange={(e) => setVal(f.id, { optionIds: e.target.value ? [e.target.value] : [] })}
        >
          <option value="">未選択</option>
          {f.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    }
    if (f.fieldType === "select_multiple") {
      return (
        <div className="space-y-1.5">
          {f.options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-body-md">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={c.optionIds.includes(o.id)}
                onChange={() => toggleOpt(f.id, o.id)}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
    if (f.fieldType === "textarea")
      return <Textarea value={c.value} onChange={(e) => setVal(f.id, { value: e.target.value })} />;
    const type = f.fieldType === "number" ? "number" : f.fieldType === "date" ? "date" : "text";
    return <Input type={type} value={c.value} onChange={(e) => setVal(f.id, { value: e.target.value })} />;
  };

  return (
    <>
      <Link
        href="/rep/roster"
        className="mb-3 inline-flex items-center gap-1 text-body-sm text-neutral-600 hover:text-neutral-900"
      >
        <ChevronLeft size={16} /> 申込名簿に戻る
      </Link>

      <PageHeader title="申込内容の編集" description={`${data.eventName} ／ ${data.name} さん`} />

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      <Card className="max-w-2xl">
        <CardTitle>申込フォーム</CardTitle>
        <div className="mt-4 space-y-4">
          {data.fields.length === 0 ? (
            <p className="text-body-md text-neutral-600">このイベントには入力項目がありません。</p>
          ) : (
            data.fields.map((f) => (
              <Field key={f.id} label={f.label} required={f.required}>
                {fieldInput(f)}
              </Field>
            ))
          )}
          <div className="flex gap-3 border-t border-neutral-200 pt-4">
            <Button onClick={onSave} disabled={pending}>
              {pending ? "保存中…" : "保存する"}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => router.push("/rep/roster")}>
              キャンセル
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
