"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";

/**
 * パスワード再設定の「申請」画面。
 * resetPasswordForEmail で再設定リンク付きメールを送る。リンクは /auth/confirm を経由して
 * セッションを確立し、next=/reset-password に着地する（そこで新パスワードを入力）。
 *
 * メール列挙攻撃を防ぐため、実在/不在に関わらず成功扱いの同じ文言を表示する。
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    // リンクの戻り先。/auth/confirm がトークンを検証してセッションを張り next に飛ばす。
    const redirectTo = `${window.location.origin}/auth/confirm?next=/reset-password`;
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    setSent(true); // 成否を漏らさないため、常に同じ案内
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-center text-heading-xl text-neutral-900">パスワード再設定</h1>
      <p className="mb-6 text-center text-body-sm text-neutral-700">
        登録メールアドレスに再設定用のリンクを送ります
      </p>
      <Card>
        {sent ? (
          <Alert variant="success">
            再設定用のメールを送信しました（登録がある場合）。メール内のリンクから新しいパスワードを設定してください。
            メールが届かない場合は迷惑メールフォルダもご確認ください。
          </Alert>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="メールアドレス" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Button type="submit" fullWidth size="lg" disabled={loading || !email.trim()}>
              {loading ? "送信中…" : "再設定メールを送る"}
            </Button>
          </form>
        )}
      </Card>
      <p className="mt-4 text-center text-body-sm text-neutral-700">
        <Link href="/login" className="text-link underline">
          ログインに戻る
        </Link>
      </p>
    </main>
  );
}
