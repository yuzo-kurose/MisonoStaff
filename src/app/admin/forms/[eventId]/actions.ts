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

/**
 * フォーム項目を保存。既存項目を入れ替える（delete→insert）。
 * RLS により管理者セッションでのみ成功する。
 * ※ 申込が入った後は項目IDを保持する upsert に変更すること（現状は未申込前提）。
 */
export async function saveForm(
  formId: string,
  formName: string,
  fields: BuilderField[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { error: nameErr } = await supabase
    .from("forms")
    .update({ name: formName } as never)
    .eq("id", formId);
  if (nameErr) return { ok: false, error: nameErr.message };

  const { error: delErr } = await supabase
    .from("form_fields")
    .delete()
    .eq("form_id", formId);
  if (delErr) return { ok: false, error: delErr.message };

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
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
      } as never)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    const fieldId = (data as { id: string } | null)?.id;
    const opts = f.options ?? [];
    if (fieldId && opts.length) {
      const { error: optErr } = await supabase.from("form_field_options").insert(
        opts.map((o, j) => ({
          form_field_id: fieldId,
          label: o.label,
          price: o.price ?? null,
          sort_order: j,
        })) as never,
      );
      if (optErr) return { ok: false, error: optErr.message };
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
