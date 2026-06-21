"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Trash2, Plus, X, GripVertical } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { yen } from "@/lib/format";
import type { FieldType } from "@/lib/mock/data";
import { saveForm, saveFormTemplate, type FormTemplate } from "./actions";

export type ClientOption = { id: string; label: string; price?: number };
export type ClientField = {
  id: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  priceCalc: "none" | "per_unit" | "option_based";
  unitPrice?: number;
  options?: ClientOption[];
};

const typeOptions: { value: FieldType; label: string }[] = [
  { value: "text", label: "テキスト" },
  { value: "textarea", label: "複数行テキスト" },
  { value: "select_single", label: "単一選択" },
  { value: "select_multiple", label: "複数選択" },
  { value: "number", label: "数値" },
  { value: "date", label: "日付" },
];

const isSelect = (t: FieldType) => t === "select_single" || t === "select_multiple";
const uid = () => Math.random().toString(36).slice(2, 9);

export function FormBuilderClient({
  eventName,
  formId,
  formName: initialName,
  initialFields,
  departments,
  branchNames,
  templates,
}: {
  eventName: string;
  formId: string;
  formName: string;
  initialFields: ClientField[];
  departments: string[];
  branchNames: string[];
  templates: FormTemplate[];
}) {
  const router = useRouter();
  const [fields, setFields] = useState<ClientField[]>(initialFields);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [formName, setFormName] = useState(initialName);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // 保存済みの内容と現在の内容を比較して「未保存の変更」を検出する。
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({ formName: initialName, fields: initialFields }),
  );
  const dirty = useMemo(
    () => JSON.stringify({ formName, fields }) !== savedSnapshot,
    [formName, fields, savedSnapshot],
  );

  const update = (id: string, patch: Partial<ClientField>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const addField = () =>
    setFields((fs) => [
      ...fs,
      { id: uid(), label: "新しい項目", fieldType: "text", required: false, priceCalc: "none" },
    ]);

  const remove = (id: string) => setFields((fs) => fs.filter((f) => f.id !== id));

  const move = (idx: number, dir: -1 | 1) =>
    setFields((fs) => {
      const next = [...fs];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return fs;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  // ドラッグ並び替え：from の項目を to の位置へ移動する。
  const reorder = (from: number, to: number) =>
    setFields((fs) => {
      if (from === to || from < 0 || to < 0 || from >= fs.length || to >= fs.length) return fs;
      const next = [...fs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  const onDrop = (idx: number) => {
    if (dragIdx !== null) reorder(dragIdx, idx);
    setDragIdx(null);
  };

  // 選択肢をマスタ（部署/拠点）の内容で置き換える。
  const fillOptionsFromMaster = (fieldId: string, names: string[]) => {
    if (names.length === 0) return;
    const f = fields.find((x) => x.id === fieldId);
    if (
      f &&
      (f.options?.length ?? 0) > 0 &&
      !window.confirm("既存の選択肢をマスタの内容で置き換えます。よろしいですか？")
    )
      return;
    setFields((fs) =>
      fs.map((x) =>
        x.id === fieldId
          ? { ...x, options: names.map((n) => ({ id: uid(), label: n, price: 0 })) }
          : x,
      ),
    );
  };

  const addOption = (fieldId: string) =>
    setFields((fs) =>
      fs.map((f) =>
        f.id === fieldId
          ? { ...f, options: [...(f.options ?? []), { id: uid(), label: "選択肢", price: 0 }] }
          : f,
      ),
    );

  const updateOption = (
    fieldId: string,
    optId: string,
    patch: Partial<{ label: string; price: number }>,
  ) =>
    setFields((fs) =>
      fs.map((f) =>
        f.id === fieldId
          ? { ...f, options: f.options?.map((o) => (o.id === optId ? { ...o, ...patch } : o)) }
          : f,
      ),
    );

  const removeOption = (fieldId: string, optId: string) =>
    setFields((fs) =>
      fs.map((f) =>
        f.id === fieldId ? { ...f, options: f.options?.filter((o) => o.id !== optId) } : f,
      ),
    );

  const priceFields = useMemo(() => fields.filter((f) => f.priceCalc !== "none"), [fields]);

  const onCancel = () => {
    if (dirty && !window.confirm("未保存の変更があります。破棄して一覧に戻りますか？")) return;
    router.push("/admin/events");
  };

  // 保存・テンプレートで共用する項目ペイロード。
  const fieldsPayload = () =>
    fields.map((f) => ({
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
      priceCalc: f.priceCalc,
      unitPrice: f.unitPrice,
      options: f.options?.map((o) => ({ label: o.label, price: o.price })),
    }));

  // 現在の項目を名前付きテンプレートとして保存。
  const onSaveTemplate = () => {
    if (fields.length === 0) {
      setMsg({ ok: false, text: "保存する項目がありません。" });
      return;
    }
    const name = window.prompt("テンプレート名を入力してください。", formName);
    if (name === null) return;
    if (!name.trim()) {
      setMsg({ ok: false, text: "テンプレート名を入力してください。" });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await saveFormTemplate(name, fieldsPayload());
      if (res.ok) {
        setMsg({ ok: true, text: `テンプレート「${name.trim()}」を保存しました。` });
        router.refresh();
      } else {
        setMsg({ ok: false, text: `テンプレート保存に失敗：${res.error ?? "不明なエラー"}` });
      }
    });
  };

  // テンプレートを現在のフォームに読み込む（既存項目を置き換え。新しいIDを採番）。
  const onLoadTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (fields.length > 0 && !window.confirm(`現在の項目を「${tpl.name}」の内容で置き換えます。よろしいですか？`)) return;
    setFields(
      tpl.fields.map((f) => ({
        id: uid(),
        label: f.label,
        fieldType: f.fieldType as ClientField["fieldType"],
        required: f.required,
        priceCalc: f.priceCalc,
        unitPrice: f.unitPrice,
        options: f.options?.map((o) => ({ id: uid(), label: o.label, price: o.price })),
      })),
    );
    setMsg({ ok: true, text: `テンプレート「${tpl.name}」を読み込みました。保存するには「保存」を押してください。` });
  };

  const onSave = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await saveForm(formId, formName, fieldsPayload());
      if (res.ok) {
        setSavedSnapshot(JSON.stringify({ formName, fields }));
        setMsg({ ok: true, text: "フォームを保存しました。" });
      } else {
        setMsg({ ok: false, text: `保存に失敗しました：${res.error ?? "不明なエラー"}` });
      }
    });
  };

  return (
    <AppShell role="admin">
      <PageHeader
        title={`フォーム編集：${eventName}`}
        description="この申込フォームはこのイベント専用です。項目の追加・並び替え・金額連動を設定できます。"
      />

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      <div className="mb-6 max-w-md">
        <Field label="フォーム名" required>
          <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
        </Field>
      </div>

      {/* テンプレート：保存・読込 */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-label-sm text-neutral-600">テンプレートから読み込む</label>
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) onLoadTemplate(e.target.value);
                e.currentTarget.value = "";
              }}
              disabled={templates.length === 0}
            >
              <option value="">
                {templates.length === 0 ? "保存済みテンプレートなし" : "テンプレートを選択…"}
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}（{t.fields.length}項目）
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={onSaveTemplate} disabled={pending}>
            現在の内容をテンプレート保存
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 編集パネル */}
        <div className="space-y-4">
          {fields.map((f, idx) => (
            <div
              key={f.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(idx)}
              className={dragIdx === idx ? "opacity-50" : ""}
            >
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragEnd={() => setDragIdx(null)}
                    title="ドラッグで並び替え"
                    aria-label="ドラッグで並び替え"
                    className="cursor-grab text-neutral-400 hover:text-neutral-600 active:cursor-grabbing"
                  >
                    <GripVertical size={18} />
                  </span>
                  <span className="text-label-sm text-neutral-600">項目 {idx + 1}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="md"
                    aria-label="上へ移動"
                    disabled={idx === 0}
                    onClick={() => move(idx, -1)}
                  >
                    <ChevronUp size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    aria-label="下へ移動"
                    disabled={idx === fields.length - 1}
                    onClick={() => move(idx, 1)}
                  >
                    <ChevronDown size={16} />
                  </Button>
                  <Button variant="ghost" size="md" aria-label="この項目を削除" onClick={() => remove(f.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <Field label="項目名" required>
                  <Input value={f.label} onChange={(e) => update(f.id, { label: e.target.value })} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="タイプ">
                    <Select
                      value={f.fieldType}
                      onChange={(e) => update(f.id, { fieldType: e.target.value as FieldType })}
                    >
                      {typeOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="金額連動">
                    <Select
                      value={f.priceCalc}
                      onChange={(e) =>
                        update(f.id, { priceCalc: e.target.value as ClientField["priceCalc"] })
                      }
                    >
                      <option value="none">なし</option>
                      <option value="per_unit">数値 × 単価</option>
                      <option value="option_based">選択肢ごとの価格</option>
                    </Select>
                  </Field>
                </div>

                <label className="flex items-center gap-2 text-body-md text-neutral-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={f.required}
                    onChange={(e) => update(f.id, { required: e.target.checked })}
                  />
                  必須項目にする
                </label>

                {f.priceCalc === "per_unit" && (
                  <Field label="単価（円）">
                    <Input
                      type="number"
                      value={f.unitPrice ?? 0}
                      onChange={(e) => update(f.id, { unitPrice: Number(e.target.value) })}
                    />
                  </Field>
                )}

                {(isSelect(f.fieldType) || f.priceCalc === "option_based") && (
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                      <span className="text-label-md text-neutral-700">選択肢</span>
                      <div className="flex flex-wrap gap-1">
                        {departments.length > 0 && (
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => fillOptionsFromMaster(f.id, departments)}
                          >
                            部署マスタ
                          </Button>
                        )}
                        {branchNames.length > 0 && (
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => fillOptionsFromMaster(f.id, branchNames)}
                          >
                            拠点マスタ
                          </Button>
                        )}
                        <Button variant="ghost" size="md" onClick={() => addOption(f.id)}>
                          <Plus size={16} /> 追加
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(f.options ?? []).map((o) => (
                        <div key={o.id} className="flex items-center gap-2">
                          <Input
                            value={o.label}
                            onChange={(e) => updateOption(f.id, o.id, { label: e.target.value })}
                          />
                          {f.priceCalc === "option_based" && (
                            <div className="w-28 flex-none">
                              <Input
                                type="number"
                                value={o.price ?? 0}
                                onChange={(e) =>
                                  updateOption(f.id, o.id, { price: Number(e.target.value) })
                                }
                              />
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="md"
                            aria-label="この選択肢を削除"
                            onClick={() => removeOption(f.id, o.id)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                      {(f.options ?? []).length === 0 && (
                        <p className="text-body-sm text-neutral-600">選択肢を追加してください。</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
            </div>
          ))}

          <Button variant="secondary" fullWidth size="lg" onClick={addField}>
            <Plus size={18} /> 項目を追加
          </Button>
        </div>

        {/* プレビュー */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <div className="flex items-center justify-between">
              <CardTitle>プレビュー（参加者画面）</CardTitle>
              <Badge variant="neutral">{fields.length} 項目</Badge>
            </div>
            <div className="mt-4 space-y-4">
              {fields.map((f) => (
                <Field
                  key={f.id}
                  label={
                    f.label +
                    (f.priceCalc === "per_unit" ? `（${yen(f.unitPrice ?? 0)}/単位）` : "")
                  }
                  required={f.required}
                >
                  {f.fieldType === "textarea" ? (
                    <Textarea disabled placeholder="（自由入力）" />
                  ) : f.fieldType === "number" ? (
                    <Input type="number" disabled placeholder="0" />
                  ) : f.fieldType === "date" ? (
                    <Input type="date" disabled />
                  ) : isSelect(f.fieldType) ? (
                    <Select disabled defaultValue="">
                      <option value="">選択してください</option>
                      {f.options?.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                          {o.price ? `（+${yen(o.price)}）` : ""}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input disabled placeholder="（テキスト）" />
                  )}
                </Field>
              ))}
              {fields.length === 0 && (
                <p className="text-body-sm text-neutral-600">項目がありません。</p>
              )}
            </div>
            {priceFields.length > 0 && (
              <p className="mt-4 text-body-sm text-neutral-600">
                金額連動項目：{priceFields.map((f) => f.label).join(" / ")}
              </p>
            )}
          </Card>
        </div>
      </div>

      <StickyActionBar
        left={
          dirty ? (
            <span className="text-warning-900">未保存の変更があります</span>
          ) : (
            <span>{fields.length} 項目 ・ 変更はありません</span>
          )
        }
      >
        <Button type="button" variant="secondary" size="lg" disabled={pending} onClick={onCancel}>
          キャンセル
        </Button>
        <Button onClick={onSave} size="lg" disabled={pending || !dirty}>
          {pending ? "保存中…" : "保存する"}
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
