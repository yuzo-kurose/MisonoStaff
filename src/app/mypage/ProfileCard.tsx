"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { toast } from "@/components/ui/toast";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { divisions } from "@/lib/mock/data";
import { updateMyProfile } from "./actions";

type Props = {
  name: string;
  division: string;
  department: string;
  departmentOptions: string[];
  branchId: string;
  branches: { id: string; name: string }[];
  email: string;
};

const divisionLabel = (v: string) => divisions.find((d) => d.value === v)?.label ?? "—";

/** 登録情報の表示＋本人編集（氏名・部・部署・所属）。メールは表示のみ。 */
export function ProfileCard({
  name,
  division,
  department,
  departmentOptions,
  branchId,
  branches,
  email,
}: Props) {
  const router = useRouter();
  const branchName = branches.find((b) => b.id === branchId)?.name ?? "—";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name, division, department, branchId });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setLoading(true);
    const res = await updateMyProfile(form);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "更新に失敗しました。");
      toast(res.error ?? "更新に失敗しました。", "error");
      return;
    }
    setEditing(false);
    setDone(true);
    toast("登録情報を更新しました。");
    router.refresh();
  }

  function onCancel() {
    setForm({ name, division, department, branchId });
    setError(null);
    setEditing(false);
  }

  return (
    <CollapsibleCard title="登録情報">
      {!editing && (
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" onClick={() => { setDone(false); setEditing(true); }}>
            <Pencil size={15} className="mr-1" />
            編集
          </Button>
        </div>
      )}

      {done && !editing && <Alert variant="success">登録情報を更新しました。</Alert>}

      {!editing ? (
        <dl className="divide-y divide-neutral-200">
          <Row label="氏名" value={name} />
          <Row label="部" value={divisionLabel(division)} />
          <Row label="部署（配置先）" value={department || "—"} />
          <Row label="所属（拠点）" value={branchName} />
          <Row label="メールアドレス" value={email} hint="変更不可" />
        </dl>
      ) : (
        <form className="space-y-4" onSubmit={onSave}>
          {error && <Alert variant="error">{error}</Alert>}
          <Field label="氏名" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
          </Field>
          <Field label="部" required>
            <Select value={form.division} onChange={(e) => set("division", e.target.value)} required>
              <option value="" disabled>選択してください</option>
              {divisions.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="部署（配置先）" hint="任意">
            <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">未選択</option>
              {/* 現在値が選択肢に無い場合（マスタから削除された等）も維持できるよう補う */}
              {form.department && !departmentOptions.includes(form.department) && (
                <option value={form.department}>{form.department}（現在の設定）</option>
              )}
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="所属（拠点）" required>
            <Select value={form.branchId} onChange={(e) => set("branchId", e.target.value)} required>
              <option value="" disabled>選択してください</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "保存中…" : "保存する"}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
              キャンセル
            </Button>
          </div>
        </form>
      )}
    </CollapsibleCard>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="flex-none text-body-sm text-neutral-600">{label}</dt>
      <dd className="text-right text-body-md text-neutral-900">
        {value}
        {hint && <span className="ml-2 text-label-sm text-neutral-500">（{hint}）</span>}
      </dd>
    </div>
  );
}
