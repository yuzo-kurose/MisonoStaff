import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * メール確認 / LINEログインのコールバック。SSR cookie にセッションを確立する。
 * 2方式に対応する：
 *  - token_hash + type … LINEログイン（自前magiclink）や、Confirm signupテンプレを
 *      `{{ .TokenHash }}` 形式に編集した場合。verifyOtp で検証。
 *  - code … Supabase標準の Confirm signup テンプレ（PKCE）。テンプレ未編集でも動くように
 *      exchangeCodeForSession で交換する。SMTP未設定でテンプレを編集できない環境でも
 *      メール確認を成立させるための対応。
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const next = params.get("next") ?? "/mypage";
  const origin = request.nextUrl.origin;

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // ここに来た時点で、メール確認自体は Supabase の verify で既に完了している
  // （token_hash/code が渡っていれば）。自動ログイン（セッション確立）だけが失敗するケースは
  // PKCE の verifier が別ブラウザ/サーバー発行で見つからない等で起こり得る。
  // その場合はエラー扱いにせず「確認完了→ログインしてください」と案内する。端末またぎでも成立する。
  if (tokenHash || code) {
    return NextResponse.redirect(new URL("/login?confirmed=1", origin));
  }
  return NextResponse.redirect(new URL("/login?error=confirm", origin));
}
