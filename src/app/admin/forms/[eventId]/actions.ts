"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BuilderOption = { label: string; price?: number };
export type BuilderField = {
  label: string;
  fieldType: string;
  required: boolean;
  priceCalc: "none" | "per_unit" | "option_based";
  unitPrice?: number;
  options?: BuilderOption[];
};

// 保存時はID付き（既存=DBのUUID / 新規=クライアント生成ID）。
export type SaveOption = { id: string; label: string; price?: number };
export type SaveField = {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  priceCalc: "none" | "per_unit" | "option_based";
  unitPrice?: number;
  fieldKey?: string | null; // 固定項目キー（保持）。予備項目は null
  options?: SaveOption[];
};

const FK_MSG =
  "回答済みの項目・選択肢は削除できません。申込が入っている項目を削除する場合は、先に該当の申込を取り消してください。";
const isFkError = (m: string) =>
  m.toLowerCase().includes("foreign key") || m.includes("participant_value");

/**
 * フォーム項目を保存。IDを保持した差分更新（既存=更新／新規=追加／削除分=削除）。
 * RLS により管理者セッションでのみ成功する。
 * 申込（participant_values）が参照する項目・選択肢は外部キー制約により削除できないため、
 * 変更しない項目はIDを維持して更新することで不要な削除を避ける。
 */
export async function saveForm(
  formId: string,
  formName: string,
  fields: SaveField[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { error: nameErr } = await supabase
    .from("forms")
    .update({ name: formName } as never)
    .eq("id", formId);
  if (nameErr) return { ok: false, error: nameErr.message };

  // 既存の項目ID（固定項目キー付き）
  const { data: exData } = await supabase
    .from("form_fields")
    .select("id,field_key")
    .eq("form_id", formId);
  const existingFields = (exData ?? []) as { id: string; field_key: string | null }[];
  const existingFieldIds = new Set(existingFields.map((f) => f.id));
  const fixedFieldIds = new Set(existingFields.filter((f) => f.field_key).map((f) => f.id));
  const keptFieldIds = new Set(fields.map((f) => f.id).filter((id) => existingFieldIds.has(id)));

  // 削除された項目を削除（固定項目は削除しない。回答済みならFKで失敗 → 分かりやすいメッセージ）
  const fieldsToDelete = [...existingFieldIds].filter(
    (id) => !keptFieldIds.has(id) && !fixedFieldIds.has(id),
  );
  if (fieldsToDelete.length) {
    const { error } = await supabase.from("form_fields").delete().in("id", fieldsToDelete);
    if (error) return { ok: false, error: isFkError(error.message) ? FK_MSG : error.message };
  }

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const isExisting = existingFieldIds.has(f.id);
    let fieldId = f.id;

    if (isExisting) {
      const { error } = await supabase
        .from("form_fields")
        .update({
          label: f.label,
          field_type: f.fieldType,
          is_required: f.required,
          sort_order: i,
          price_calc_type: f.priceCalc,
          unit_price: f.unitPrice ?? null,
        } as never)
        .eq("id", f.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { data, error } = await supabase
        .from("form_fields")
        .insert({
          form_id: formId,
          label: f.label,
          field_type: f.fieldType,
          is_required: f.required,
          sort_order: i,
          price_calc_type: f.priceCalc,
          unit_price: f.unitPrice ?? null,
          field_key: f.fieldKey ?? null,
        } as never)
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      fieldId = (data as { id: string }).id;
    }

    // 選択肢も差分更新
    const opts = f.options ?? [];
    let existingOptIds = new Set<string>();
    if (isExisting) {
      const { data: exOpt } = await supabase
        .from("form_field_options")
        .select("id")
        .eq("form_field_id", fieldId);
      existingOptIds = new Set(((exOpt ?? []) as { id: string }[]).map((o) => o.id));
      const keptOptIds = new Set(opts.map((o) => o.id).filter((id) => existingOptIds.has(id)));
      const optsToDelete = [...existingOptIds].filter((id) => !keptOptIds.has(id));
      if (optsToDelete.length) {
        const { error } = await supabase.from("form_field_options").delete().in("id", optsToDelete);
        if (error) return { ok: false, error: isFkError(error.message) ? FK_MSG : error.message };
      }
    }

    for (let j = 0; j < opts.length; j++) {
      const o = opts[j];
      if (existingOptIds.has(o.id)) {
        const { error } = await supabase
          .from("form_field_options")
          .update({ label: o.label, price: o.price ?? null, sort_order: j } as never)
          .eq("id", o.id);
        if (error) return { ok: false, error: error.message };
      } else {
        const { error } = await supabase.from("form_field_options").insert({
          form_field_id: fieldId,
          label: o.label,
          price: o.price ?? null,
          sort_order: j,
        } as never);
        if (error) return { ok: false, error: error.message };
      }
    }
  }

  revalidatePath(`/admin/forms/${formId}`);
  return { ok: true };
}

export type FormTemplate = { id: string; name: string; fields: BuilderField[] };

/** フォームテンプレート一覧（管理者）。テーブル未作成等は空扱いにしてビルダーを壊さない。 */
export async function getFormTemplates(): Promise<FormTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("form_templates")
    .select("id,name,fields")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as FormTemplate[];
}

/** 現在のフォーム項目を名前付きテンプレートとして保存する（管理者のみ／RLS）。 */
export async function saveFormTemplate(
  name: string,
  fields: BuilderField[],
): Promise<{ ok: boolean; error?: string }> {
  if (!name.trim()) return { ok: false, error: "テンプレート名を入力してください。" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const { error } = await supabase
    .from("form_templates")
    .insert({ name: name.trim(), fields, created_by: user.id } as never);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
