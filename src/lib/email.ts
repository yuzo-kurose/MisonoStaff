import "server-only";
import { Resend } from "resend";

let _resend: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

/**
 * メール送信（Resend）。
 * RESEND_API_KEY 未設定なら送信せず { sent:false } を返す（呼び出し側はログに残す）。
 * 差出人は EMAIL_FROM（未設定時は Resend のテスト用 onboarding@resend.dev）。
 *   ※ 独自ドメイン送信には Resend でのドメイン認証が必要。
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  const c = client();
  if (!c) return { sent: false, error: "RESEND_API_KEY 未設定" };
  const from = process.env.EMAIL_FROM || "神苑スタッフ <onboarding@resend.dev>";
  try {
    const { error } = await c.emails.send({ from, to, subject, html });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "送信に失敗しました。" };
  }
}
