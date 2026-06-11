"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

/**
 * 部署マスタの操作。
 * 通常の user セッション client を使う＝RLS が効く。dept_write_admin ポリシーにより
 * 管理者のみ insert/update/delete が成功する（service_role を使わないので認可は RLS が保証）。
 * RLS の is_admin() は auth_role() 経由で profiles.role を権威的に読むため、JWT の鮮度に
 * 依存せず判定される（migration 20260611000004）。拠点マスタと同じ方式。
 */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "ログインが必要です。" as string | null };
  return { supabase, error: null as string | null };
}

/** 部署を追加。並び順は末尾（既存最大+1）。RLS により管理者のみ成功。 */
export async function createDepartment(name: string): Promise<Result> {
  if (!name.trim()) return { ok: false, error: "部署名を入力してください。" };
  const { supabase, error } = await requireUser();
  if (error) return { ok: false, error };

  // 末尾に追加するため現在の最大 sort_order を取得
  const { data: maxRow } = await supabase
    .from("departments")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { error: insErr } = await supabase.from("departments").insert({
    name: name.trim(),
    sort_order: nextOrder,
    is_active: true,
  } as never);
  if (insErr) {
    if (insErr.code === "23505" || insErr.message.toLowerCase().includes("duplicate"))
      return { ok: false, error: "同じ名前の部署が既にあります。" };
    return { ok: false, error: insErr.message };
  }

  revalidatePath("/admin/departments");
  return { ok: true };
}

/** 部署名を変更。 */
export async function updateDepartment(id: string, name: string): Promise<Result> {
  if (!name.trim()) return { ok: false, error: "部署名を入力してください。" };
  const { supabase, error } = await requireUser();
  if (error) return { ok: false, error };

  const { error: upErr } = await supabase
    .from("departments")
    .update({ name: name.trim() } as never)
    .eq("id", id);
  if (upErr) {
    if (upErr.code === "23505" || upErr.message.toLowerCase().includes("duplicate"))
      return { ok: false, error: "同じ名前の部署が既にあります。" };
    return { ok: false, error: upErr.message };
  }

  revalidatePath("/admin/departments");
  return { ok: true };
}

/**
 * 部署を削除（選択肢から除外）。
 * profiles.department は名称を保持しているため、既に設定済みの利用者の値は変わらない
 * （表示は残るが、今後この部署は新規選択できなくなる）。
 */
export async function deleteDepartment(id: string): Promise<Result> {
  const { supabase, error } = await requireUser();
  if (error) return { ok: false, error };

  const { error: delErr } = await supabase.from("departments").delete().eq("id", id);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath("/admin/departments");
  return { ok: true };
}
