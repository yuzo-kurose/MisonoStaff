"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type RegisterInput = {
  name: string;
  kana: string;
  email: string;
  password: string;
  branch_id: string;
  division: string;
};

/**
 * 参加者の初期登録。
 * service_role で「メール確認済み」ユーザーを作成 → そのまま即ログイン可能にする。
 * （プロジェクトのメール確認設定に関わらず、登録直後から利用できる）
 * profiles 行は handle_new_user トリガが user_metadata から自動作成する。
 */
export async function registerParticipant(
  input: RegisterInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!input.name.trim() || !input.kana.trim())
    return { ok: false, error: "氏名・読み仮名を入力してください。" };
  if (!input.email.trim() || input.password.length < 8)
    return { ok: false, error: "メールとパスワード（8文字以上）を入力してください。" };
  if (!input.branch_id) return { ok: false, error: "所属（拠点）を選択してください。" };
  if (!input.division) return { ok: false, error: "部を選択してください。" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      kana: input.kana,
      branch_id: input.branch_id,
      division: input.division,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already"))
      return { ok: false, error: "このメールアドレスは既に登録されています。" };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
