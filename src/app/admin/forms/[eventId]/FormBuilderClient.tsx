"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Trash2, Plus, X, GripVertical } from "lucide-react";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { yen } from "@/lib/format";
import type { FieldType } from "@/lib/mock/data";
import { MAX_SPARE_FIELDS } from "@/lib/forms/fixed";
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
  fieldKey?: string | null; // 固定項目キー。予備項目は null/undefined
};

const isFixed = (f: ClientField) => !!f.fieldKey;

const typeOptions: { value: FieldType; label: string }[] = [
  { value: "text", label: "テキスト" },
  { value: "textarea", label: "複数行テキスト" },
  { value: "select_single", label: "単一選択（プルダウン）" },
  { value: "radio", label: "ラジオボタン（単一選択）" },
  { value: "select_multiple", label: "複数選択" },
  { value: "number", label: "数値" },
  { value: "date", label: "日付" },
];

const isSelect = (t: FieldType) =>
  t === "select_single" || t === "select_multiple" || t === "radio";
const uid = () => Math.random().toString(36).slice(2, 9);

// このタイプでは金額連動が成立しない（＝金額が計算されなくなる）かを判定する。
//  - option_based は選択式（プルダウン/ラジオ/複数選択）が前提
//  - per_unit は数値が前提
const priceBreaksWithType = (
  priceCalc: ClientField["priceCalc"],
  fieldType: FieldType,
) =>
  (priceCalc === "option_based" && !isSelect(fieldType)) ||
  (priceCalc === "per_unit" && fieldType !== "number");

export function FormBuilderClient({
  eventName,
  formId,
  formName: initialName,
  formDescription: initialDescription,
  initialFields,
  departments,
  branchNames,
  templates,
}: {
  eventName: string;
  formId: string;
  formName: string;
  formDescription: string | null;
  initialFields: ClientField[];
  departments: string[];
  branchNames: string[];
  templates: FormTemplate[];
}) {
  const router = useRouter();
  const [fields, setFields] = useState<ClientField[]>(initialFields);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [formName, setFormName] = useState(initialName);
  const [formDescription, setFormDescription] = useState(initialDescription ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // 保存済みの内容と現在の内容を比較して「未保存の変更」を検出する。
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({ formName: initialName, formDescription: initialDescription ?? "", fields: initialFields }),
  );
  const dirty = useMemo(
    () => JSON.stringify({ formName, formDescription, fields }) !== savedSnapshot,
    [formName, formDescription, fields, savedSnapshot],
  );

  // 予備項目数（固定項目は除く）と、予備項目の開始位置。
  const spareCount = fields.filter((f) => !isFixed(f)).length;
  const firstSpareIdx = fields.findIndex((f) => !isFixed(f));

  const update = (id: string, patch: Partial<ClientField>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  // 予備項目を追加（最大 MAX_SPARE_FIELDS 個）。固定項目はイベント作成時に投入済み。
  const addField = () => {
    if (spareCount >= MAX_SPARE_FIELDS) return;
    setFields((fs) => [
      ...fs,
      { id: uid(), label: "予備項目", fieldType: "text", required: false, priceCalc: "none", fieldKey: null },
    ]);
  };

  const remove = (id: string) =>
    setFields((fs) => fs.filter((f) => f.id !== id || isFixed(f)));

  // 並べ替えは予備項目どうしのみ（固定項目は先頭固定）。
  const move = (idx: number, dir: -1 | 1) =>
    setFields((fs) => {
      const j = idx + dir;
      if (j < firstSpareIdx || j >= fs.length || isFixed(fs[idx])) return fs;
      const next = [...fs];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  // ドラッグ並び替え：予備項目の範囲内のみ。
  const reorder = (from: number, to: number) =>
    setFields((fs) => {
      if (from === to || from < firstSpareIdx || to < firstSpareIdx) return fs;
      if (from >= fs.length || to >= fs.length || isFixed(fs[from]) || isFixed(fs[to])) return fs;
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

  // テンプレート保存用ペイロード（IDなし・全項目）。
  // 固定項目（参加費/往路/復路）の選択肢・価格も保存するため fieldKey 付きで全項目を含める。
  const fieldsPayload = () =>
    fields.map((f) => ({
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
      priceCalc: f.priceCalc,
      unitPrice: f.unitPrice,
      fieldKey: f.fieldKey ?? null,
      options: f.options?.map((o) => ({ label: o.label, price: o.price })),
    }));

  // フォーム保存用ペイロード（差分更新のためID付き・固定キーを保持）。
  const fieldsSavePayload = () =>
    fields.map((f) => ({
      id: f.id,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
      priceCalc: f.priceCalc,
      unitPrice: f.unitPrice,
      fieldKey: f.fieldKey ?? null,
      options: f.options?.map((o) => ({ id: o.id, label: o.label, price: o.price })),
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
      const res = await saveFormTemplate(name, fieldsPayload(), formDescription);
      if (res.ok) {
        setMsg({ ok: true, text: `テンプレート「${name.trim()}」を保存しました。` });
        router.refresh();
      } else {
        setMsg({ ok: false, text: `テンプレート保存に失敗：${res.error ?? "不明なエラー"}` });
      }
    });
  };

  // テンプレートを読み込む。
  //  - 固定項目（参加費/往路/復路）：現在の項目IDを保持しつつ、テンプレの選択肢・価格・
  //    ラベル・タイプ等を反映（fieldKey で対応付け）。
  //  - 予備項目：テンプレの予備項目で置き換える（最大5個）。
  //  - 説明文：テンプレの説明文を反映。
  const onLoadTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (
      !window.confirm(
        `テンプレート「${tpl.name}」の内容（固定項目の選択肢・価格、予備項目、説明文）を反映します。現在の内容は置き換えられます。よろしいですか？`,
      )
    )
      return;

    const tplFixed = tpl.fields.filter((f) => !!f.fieldKey);
    const tplSpares = tpl.fields.filter((f) => !f.fieldKey);

    // 現在の固定項目に、テンプレの同キー項目の内容を反映（IDは保持＝差分更新を維持）。
    const fixed = fields
      .filter((f) => isFixed(f))
      .map((f) => {
        const t = tplFixed.find((x) => x.fieldKey === f.fieldKey);
        if (!t) return f;
        return {
          ...f,
          label: t.label,
          fieldType: t.fieldType as ClientField["fieldType"],
          required: t.required,
          priceCalc: t.priceCalc,
          unitPrice: t.unitPrice,
          options: t.options?.map((o) => ({ id: uid(), label: o.label, price: o.price })),
        };
      });

    const spares = tplSpares.slice(0, MAX_SPARE_FIELDS).map((f) => ({
      id: uid(),
      label: f.label,
      fieldType: f.fieldType as ClientField["fieldType"],
      required: f.required,
      priceCalc: f.priceCalc,
      unitPrice: f.unitPrice,
      options: f.options?.map((o) => ({ id: uid(), label: o.label, price: o.price })),
      fieldKey: null,
    }));

    setFields([...fixed, ...spares]);
    setFormDescription(tpl.description ?? "");
    const dropped = tplSpares.length - spares.length;
    setMsg({
      ok: true,
      text: `テンプレート「${tpl.name}」を読み込みました。${
        dropped > 0 ? `（予備項目は上限${MAX_SPARE_FIELDS}個のため${dropped}項目は読み込まれていません）` : ""
      }保存するには「保存」を押してください。`,
    });
  };

  const onSave = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await saveForm(formId, formName, fieldsSavePayload(), formDescription);
      if (res.ok) {
        setSavedSnapshot(JSON.stringify({ formName, formDescription, fields }));
        setMsg({ ok: true, text: "フォームを保存しました。" });
        toast("フォームを保存しました。");
      } else {
        setMsg({ ok: false, text: `保存に失敗しました：${res.error ?? "不明なエラー"}` });
        toast(`保存に失敗しました：${res.error ?? "不明なエラー"}`, "error");
      }
    });
  };

  return (
    <>
      <PageHeader
        title={`フォーム編集：${eventName}`}
        description="この申込フォームはこのイベント専用です。項目の追加・並び替え・金額連動を設定できます。"
      />

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      <div className="mb-6 max-w-2xl space-y-4">
        <div className="max-w-md">
          <Field label="フォーム名" required>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
          </Field>
        </div>
        <Field label="フォームの説明文" hint="申込画面の先頭に表示されます（任意・改行可）。注意事項や持ち物などを記載できます。">
          <Textarea
            rows={3}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="例）当日は動きやすい服装でお越しください。集合は8:30、解散は16:00予定です。"
          />
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
                  {t.name}（予備{t.fields.filter((f) => !f.fieldKey).length}項目）
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
                  {isFixed(f) ? (
                    <span className="text-neutral-300" title="固定項目（削除・並び替え不可・編集は可能）">
                      <GripVertical size={18} />
                    </span>
                  ) : (
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
                  )}
                  <span className="text-label-sm text-neutral-600">項目 {idx + 1}</span>
                  {isFixed(f) ? (
                    <Badge variant="info">固定</Badge>
                  ) : (
                    <Badge variant="neutral">予備</Badge>
                  )}
                </div>
                {!isFixed(f) && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="md"
                      aria-label="上へ移動"
                      disabled={idx <= firstSpareIdx}
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
                )}
              </div>

              <div className="mt-3 space-y-3">
                <Field label="項目名" required>
                  <Input
                    value={f.label}
                    onChange={(e) => update(f.id, { label: e.target.value })}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="タイプ">
                    <Select
                      value={f.fieldType}
                      onChange={(e) => {
                        const newType = e.target.value as FieldType;
                        // 金額連動が壊れるタイプ変更は確認する（誤って金額が0になるのを防ぐ）。
                        if (
                          priceBreaksWithType(f.priceCalc, newType) &&
                          !window.confirm(
                            "この項目は金額連動が設定されています。このタイプに変更すると金額が計算されなくなります。変更しますか？",
                          )
                        )
                          return;
                        update(f.id, { fieldType: newType });
                      }}
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
                      onChange={(e) => {
                        const newCalc = e.target.value as ClientField["priceCalc"];
                        // 金額連動を「なし」にする＝金額に反映されなくなるため確認する。
                        if (
                          f.priceCalc !== "none" &&
                          newCalc === "none" &&
                          !window.confirm(
                            "金額連動を「なし」にすると、この項目は金額に反映されなくなります。変更しますか？",
                          )
                        )
                          return;
                        update(f.id, { priceCalc: newCalc });
                      }}
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
                            variant="secondary"
                            size="sm"
                            onClick={() => fillOptionsFromMaster(f.id, departments)}
                          >
                            部署マスタ
                          </Button>
                        )}
                        {branchNames.length > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fillOptionsFromMaster(f.id, branchNames)}
                          >
                            拠点マスタ
                          </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => addOption(f.id)}>
                          <Plus size={16} /> 追加
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(f.options ?? []).map((o) => (
                        <div key={o.id} className="flex items-start gap-2">
                          <Textarea
                            rows={2}
                            value={o.label}
                            onChange={(e) => updateOption(f.id, o.id, { label: e.target.value })}
                            className="!min-h-[2.75rem]"
                            placeholder="選択肢（改行可）"
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

          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={addField}
            disabled={spareCount >= MAX_SPARE_FIELDS}
          >
            <Plus size={18} /> 予備項目を追加（{spareCount}/{MAX_SPARE_FIELDS}）
          </Button>
          <p className="text-body-sm text-neutral-500">
            参加費・往路・復路は全イベント共通の固定項目です。項目名・タイプ・金額連動・選択肢を
            イベントごとに編集できます（削除・並び替えはできません）。
          </p>
        </div>

        {/* プレビュー */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <div className="flex items-center justify-between">
              <CardTitle>プレビュー（参加者画面）</CardTitle>
              <Badge variant="neutral">{fields.length} 項目</Badge>
            </div>
            {formDescription.trim() && (
              <p className="mt-4 whitespace-pre-line rounded-lg border border-info-100 bg-info-100/40 px-3 py-2.5 text-body-sm text-neutral-700">
                {formDescription}
              </p>
            )}
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
                  ) : f.fieldType === "radio" || f.fieldType === "select_multiple" ? (
                    <div className="space-y-1.5">
                      {(f.options ?? []).map((o) => (
                        <label key={o.id} className="flex items-start gap-2 text-body-md text-neutral-700">
                          <input
                            type={f.fieldType === "radio" ? "radio" : "checkbox"}
                            disabled
                            className="mt-1 h-4 w-4 flex-none"
                          />
                          <span className="whitespace-pre-line">
                            {o.label}
                            {o.price ? `（+${yen(o.price)}）` : ""}
                          </span>
                        </label>
                      ))}
                      {(f.options ?? []).length === 0 && (
                        <p className="text-body-sm text-neutral-500">選択肢を追加してください。</p>
                      )}
                    </div>
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
    </>
  );
}
