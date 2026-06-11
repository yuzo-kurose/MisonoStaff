"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guard";

type Result = { ok: boolean; error?: string };

/**
 * 部署マスタの操作。
 *
 * なぜ admin client(service_role) + requireRole なのか：
 *   RLS の is_admin() は JWT(app_metadata.role) を見るが、ブラウザの access token が
 *   role 同期前に発行されていると role が乗っておらず、画面は開けても INSERT が
 *   「new row violates row-level security policy」で弾かれることがある（getUser は
 *   DB の最新 app_metadata を返すためミドルウェアは通る、という食い違い）。
 *   そこで返金・代行登録と同じく、service_role で RLS を迂回しつつ requireRole で
 *   呼び出し元が管理者であることを必ず自己検証する（guard は getUser 由来＝最新）。
 *   テーブルの RLS は多層防御として残す（service_role は迂回する）。
 */

/** 部署を追加。並び順は末尾（既存最大+1）。 */
export async function createDepartment(name: string): Promise<Result> {
  if (!name.trim()) return { ok: false, error: "部署名を入力してください。" };
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  // 末尾に追加するため現在の最大 sort_order を取得
  const { data: maxRow } = await admin
    .from("departments")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { error: insErr } = await admin.from("departments").insert({
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
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { error: upErr } = await admin
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
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("departments").delete().eq("id", id);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath("/admin/departments");
  return { ok: true };
}
