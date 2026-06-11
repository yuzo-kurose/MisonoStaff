"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

/**
 * 新パスワード入力画面。
 * ここに来る前に /auth/confirm が recovery トークンを検証してセッションを確立済みである前提。
 * updateUser でパスワードを更新する。セッションが無い（リンク期限切れ等）場合は申請画面へ誘導。
 */
function ResetPasswordForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setChecking(false);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (password !== confirm) {
      setError("確認用パスワードが一致しません。");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-center text-heading-xl text-neutral-900">新しいパスワード</h1>
      <p className="mb-6 text-center text-body-sm text-neutral-700">
        新しいパスワードを設定してください
      </p>
      <Card>
        {checking ? (
          <p className="text-center text-body-sm text-neutral-700">確認中…</p>
        ) : done ? (
          <Alert variant="success">
            パスワードを更新しました。ログイン画面に移動します…
          </Alert>
        ) : !hasSession ? (
          <Alert variant="error">
            再設定リンクが無効か期限切れです。お手数ですが、もう一度{" "}
            <Link href="/forgot-password" className="underline">
              再設定メールの送信
            </Link>
            からやり直してください。
          </Alert>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            {error && <Alert variant="error">{error}</Alert>}
            <Field label="新しいパスワード（8文字以上）" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="新しいパスワード（確認）" required>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "更新中…" : "パスワードを更新"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
