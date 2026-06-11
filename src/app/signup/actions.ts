"use server";

import { createClient } from "@/lib/supabase/server";

export type RegisterInput = {
  name: string;
  kana: string;
  email: string;
  password: string;
  branch_id: string;
  division: string;
  department?: string; // 配置先（任意）
};

/**
 * 参加者の初期登録（メール確認必須）。
 *
 * signUp を使い、確認メールを送信する。ユーザーはメール内リンク（/auth/confirm）で
 * 本人確認するまでログインできない＝メールアドレスの所有を確認してから利用開始になる。
 * profiles 行は handle_new_user トリガが user_metadata から作成する（確認前でも作成されるが
 * ログイン不可なので実害なし）。
 *
 * セキュリティ上の注意:
 *   既存メールで signUp しても Supabase はエラーを返さず（メール列挙攻撃の防止）、
 *   ダミーのレスポンスを返す。よって呼び出し側は成否に関わらず
 *   「確認メールを送信しました」と表示する（実在判定を漏らさない）。
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

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      // handle_new_user トリガがこのメタデータから profiles を作る
      data: {
        name: input.name.trim(),
        kana: input.kana.trim(),
        branch_id: input.branch_id,
        division: input.division,
        department: input.department?.trim() || "",
      },
      // 確認リンクの戻り先（token_hash を /auth/confirm が検証してセッション確立）
      emailRedirectTo: `${appUrl}/auth/confirm?next=/mypage`,
    },
  });

  // メール列挙を防ぐため、既存メール等の詳細はユーザーに返さない。
  // 設定不備など明確なエラーのみ通知する。
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
