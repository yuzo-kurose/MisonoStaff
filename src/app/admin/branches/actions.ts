"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "ログインが必要です。" as string | null };
  return { supabase, error: null as string | null };
}

/** 拠点を新規作成（拠点名・代表者）。RLS により管理者のみ成功。 */
export async function createBranch(input: {
  name: string;
  representativeUserId: string;
}): Promise<Result> {
  if (!input.name.trim()) return { ok: false, error: "拠点名を入力してください。" };
  const { supabase, error } = await ensureAdmin();
  if (error) return { ok: false, error };

  const { error: insErr } = await supabase.from("branches").insert({
    name: input.name.trim(),
    representative_user_id: input.representativeUserId || null,
    is_active: true,
  } as never);
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/admin/branches");
  revalidateTag("branches");
  return { ok: true };
}

/** 拠点名・代表者を更新（代表者の設定・変更・解除もここで行う）。 */
export async function updateBranch(
  id: string,
  input: { name: string; representativeUserId: string },
): Promise<Result> {
  if (!input.name.trim()) return { ok: false, error: "拠点名を入力してください。" };
  const { supabase, error } = await ensureAdmin();
  if (error) return { ok: false, error };

  const { error: upErr } = await supabase
    .from("branches")
    .update({
      name: input.name.trim(),
      representative_user_id: input.representativeUserId || null,
    } as never)
    .eq("id", id);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/admin/branches");
  revalidateTag("branches");
  return { ok: true };
}
