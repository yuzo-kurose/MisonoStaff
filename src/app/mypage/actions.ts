"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileEditInput = {
  name: string;
  division: string;
  department: string; // 配置先（任意・空可）
  branchId: string; // 所属拠点（本人が変更可能）
};

/**
 * ログイン中ユーザー本人の登録情報（氏名・部・部署・所属）を更新する。
 *
 * 通常の user セッション client を使う＝RLS が効く。profiles_update_self ポリシーにより
 * 自分の行だけ更新でき、role は WITH CHECK で固定（権限の自己昇格を防ぐ）。
 * branch_id（所属）は本人が変更可能。service_role を使わないので認可は RLS が保証する。
 */
export async function updateMyProfile(
  input: ProfileEditInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!input.name.trim()) return { ok: false, error: "氏名を入力してください。" };
  if (!input.division) return { ok: false, error: "部を選択してください。" };
  if (!input.branchId) return { ok: false, error: "所属（拠点）を選択してください。" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const { error } = await supabase
    .from("profiles")
    .update({
      name: input.name.trim(),
      division: input.division,
      department: input.department.trim() || null,
      branch_id: input.branchId,
    } as never)
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  return { ok: true };
}

/** 本人のヒーロー画像URLを保存（null で既定画像に戻す）。RLS で自分の行のみ更新。 */
export async function updateMyHeroImage(
  url: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const { error } = await supabase
    .from("profiles")
    .update({ hero_image_url: url } as never)
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  return { ok: true };
}
