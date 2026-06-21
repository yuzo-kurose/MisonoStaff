"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { branches, divisions } from "@/lib/mock/data";
import { registerParticipant } from "./actions";

type Method = "email" | "line";

/** 部署（配置先）は DB の部署マスタから取得した一覧を受け取る（任意選択）。 */
export function SignupForm({ departments }: { departments: string[] }) {
  const [method, setMethod] = useState<Method>("email");
  const [form, setForm] = useState({
    branch_id: "",
    division: "",
    department: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // 認証方法に関わらず必須のプロフィール項目
  const profileFilled =
    Boolean(form.branch_id) && Boolean(form.division) && form.name.trim() !== "";

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (method !== "email") return; // LINEモードでのEnter誤送信を無視
    setError(null);
    setLoading(true);

    const res = await registerParticipant(form);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "登録に失敗しました。");
      return;
    }
    // メール確認必須。確認メールを送ったので、リンク押下までは画面遷移しない。
    setSent(true);
  }

  // LINE連携：入力済みプロフィールを OAuth に引き渡してアカウントへ反映する
  function startLine() {
    setError(null);
    if (!profileFilled) {
      setError("所属・部・氏名を入力してください。");
      return;
    }
    const q = new URLSearchParams({
      branch_id: form.branch_id,
      division: form.division,
      department: form.department,
      name: form.name,
    });
    window.location.href = `/auth/line/login?${q.toString()}`;
  }

  const tab = (m: Method, label: string) => (
    <button
      type="button"
      onClick={() => setMethod(m)}
      className={`rounded-md py-2 text-label-md font-medium transition-colors ${
        method === m ? "bg-neutral-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-center text-heading-xl text-neutral-900">新規登録</h1>
      <p className="mb-6 text-center text-body-sm text-neutral-700">以下の情報を登録します</p>
      {sent ? (
        <Card>
          <div className="space-y-4 text-center">
            <p className="text-heading-md text-neutral-900">確認メールを送信しました</p>
            <p className="text-body-sm text-neutral-700">
              <span className="font-medium">{form.email}</span> 宛に確認メールを送りました。
              メール内のリンクをクリックすると登録が完了し、ログインできるようになります。
            </p>
            <p className="text-body-sm text-neutral-600">
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </p>
            <Link href="/login" className="inline-block text-link underline">
              ログイン画面へ
            </Link>
          </div>
        </Card>
      ) : (
      <Card>
        <form className="space-y-4" onSubmit={onSubmitEmail}>
          {error && <Alert variant="error">{error}</Alert>}

          {/* 認証方法に関わらず必須のプロフィール */}
          <Field label="所属（拠点）" required>
            <Select value={form.branch_id} onChange={(e) => set("branch_id", e.target.value)} required>
              <option value="" disabled>
                選択してください
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="部" required>
            <Select value={form.division} onChange={(e) => set("division", e.target.value)} required>
              <option value="" disabled>
                選択してください
              </option>
              {divisions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="部署（配置先）" hint="任意。決まっていなければ未選択のままで構いません">
            <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">未選択</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="氏名" required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="山田 太郎"
              autoComplete="name"
            />
          </Field>

          {/* 認証方法の選択 */}
          <div>
            <p className="text-label-md text-neutral-900">ログイン方法</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1">
              {tab("email", "メールアドレス")}
              {tab("line", "LINE連携")}
            </div>
          </div>

          {method === "email" ? (
            <>
              <Field label="メールアドレス" required hint="ログインIDになります">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="staff@example.com"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="パスワード" required hint="8文字以上">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? "登録中…" : "登録する"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-body-sm text-neutral-600">
                LINEでログインします。パスワードは不要です。上の所属・部・氏名・読み仮名はそのまま登録されます。
              </p>
              <button
                type="button"
                onClick={startLine}
                disabled={!profileFilled}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-6 py-3 text-label-lg font-medium text-neutral-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                LINEで登録・連携
              </button>
            </>
          )}
        </form>
      </Card>
      )}
      {!sent && (
        <p className="mt-4 text-center text-body-sm text-neutral-700">
          既にアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-link underline">
            ログイン
          </Link>
        </p>
      )}
    </main>
  );
}
