"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";

/**
 * ログイン中の本人がパスワードを変更するカード。
 * セキュリティのため、まず現在のパスワードで再認証（signInWithPassword）してから
 * updateUser で新パスワードに更新する。放置中のセッションを乗っ取られても勝手に
 * 変更されないようにするため。
 */
export function ChangePasswordCard({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next.length < 8) {
      setError("新しいパスワードは8文字以上で入力してください。");
      return;
    }
    if (next !== confirm) {
      setError("確認用パスワードが一致しません。");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    // 1) 現在のパスワードで本人確認（誤りなら更新しない）
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInErr) {
      setLoading(false);
      setError("現在のパスワードが正しくありません。");
      return;
    }
    // 2) 新パスワードへ更新
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (updErr) {
      setError("パスワードの更新に失敗しました。");
      return;
    }
    reset();
    setOpen(false);
    setDone(true);
  }

  return (
    <CollapsibleCard title="パスワード">
      {!open && (
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" onClick={() => { setDone(false); setOpen(true); }}>
            <KeyRound size={15} className="mr-1" />
            変更
          </Button>
        </div>
      )}

      {done && !open && <Alert variant="success">パスワードを変更しました。</Alert>}

      {!open ? (
        <p className="text-body-sm text-neutral-600">
          ログインに使うパスワードを変更できます。
        </p>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          {error && <Alert variant="error">{error}</Alert>}
          <Field label="現在のパスワード" required>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field label="新しいパスワード（8文字以上）" required>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
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
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "変更中…" : "変更する"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { reset(); setOpen(false); }}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      )}
    </CollapsibleCard>
  );
}
