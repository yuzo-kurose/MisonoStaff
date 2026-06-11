"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileEditInput = {
  name: string;
  kana: string;
  division: string;
  department: string; // 配置先（任意・空可）
};

/**
 * ログイン中ユーザー本人の登録情報（氏名・読み仮名・部）を更新する。
 *
 * 通常の user セッション client を使う＝RLS が効く。profiles_update_self ポリシーにより
 * 自分の行だけ更新でき、role と branch_id は WITH CHECK で固定されている（所属の変更は管理者のみ）。
 * service_role を使わないので認可は RLS が保証する。
 */
export async function updateMyProfile(
  input: ProfileEditInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!input.name.trim() || !input.kana.trim())
    return { ok: false, error: "氏名・読み仮名を入力してください。" };
  if (!input.division) return { ok: false, error: "部を選択してください。" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const { error } = await supabase
    .from("profiles")
    .update({
      name: input.name.trim(),
      kana: input.kana.trim(),
      division: input.division,
      department: input.department.trim() || null,
    } as never)
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/mypage");
  return { ok: true };
}
