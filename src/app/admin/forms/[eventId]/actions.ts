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
