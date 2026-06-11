"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  line_unconfigured: "LINE連携は現在利用できません（未設定）。メールでログインしてください。",
  line_state: "LINE連携の検証に失敗しました。お手数ですがもう一度お試しください。",
  line_create: "LINEアカウントの作成に失敗しました。同じメールが既に登録されている可能性があります。",
  line_session: "LINEログインのセッション確立に失敗しました。",
  line_error: "LINE連携でエラーが発生しました。",
  confirm: "ログインの確認に失敗しました。",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    () => ERROR_MESSAGES[params.get("error") ?? ""] ?? null,
  );
  // メール確認が完了して戻ってきた場合の案内
  const notice = params.get("confirmed") === "1"
    ? "メールアドレスの確認が完了しました。登録したメールとパスワードでログインしてください。"
    : null;
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }
    // 役割に応じて遷移先を決定
    const { data } = await supabase.auth.getUser();
    const role = (data.user?.app_metadata as { role?: string } | undefined)?.role;
    const dest =
      params.get("redirect") ??
      (role === "admin"
        ? "/admin/events"
        : role === "representative"
          ? "/rep/roster"
          : role === "reception"
            ? "/reception"
            : "/mypage");
    router.push(dest);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-center text-heading-xl text-neutral-900">ログイン</h1>
      <p className="mb-6 text-center text-body-sm text-neutral-700">
        神苑スタッフ 参加申込システム
      </p>
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          {notice && <Alert variant="success">{notice}</Alert>}
          {error && <Alert variant="error">{error}</Alert>}
          <Field label="メールアドレス" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="パスワード" required>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "ログイン中…" : "ログイン"}
          </Button>
          <p className="text-center text-body-sm">
            <Link href="/forgot-password" className="text-link underline">
              パスワードを忘れた方
            </Link>
          </p>
        </form>
      </Card>
      <p className="mt-4 text-center text-body-sm text-neutral-700">
        アカウントがない方は{" "}
        <Link href="/signup" className="text-link underline">
          新規登録
        </Link>
      </p>
    </main>
  );
}
