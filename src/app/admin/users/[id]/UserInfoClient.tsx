"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCog, ShieldCheck } from "lucide-react";
import { SectionPanel } from "@/components/ui/SectionPanel";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  setUserRole,
  setUserDivision,
  setUserName,
  setUserBranch,
  type UserDetail,
} from "../actions";

const ROLE_OPTIONS = [
  { value: "participant", label: "ユーザー" },
  { value: "representative", label: "所属代表者" },
  { value: "admin", label: "管理者" },
  { value: "reception", label: "受付" },
];
const DIVISION_OPTIONS = [
  { value: "student", label: "学生部" },
  { value: "university", label: "大学生部" },
  { value: "adult", label: "成人部" },
  { value: "mens", label: "男子部" },
  { value: "general", label: "一般" },
];

/** ユーザー詳細：認証情報（変更不可）＋基本情報の編集（管理者のみ）。 */
export function UserInfoClient({
  user,
  branches,
}: {
  user: UserDetail;
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(user.name);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? { ok: true, text: okText } : { ok: false, text: `変更に失敗：${res.error}` });
      if (res.ok) router.refresh();
    });
  };

  return (
    <>
      {/* 認証情報（変更不可） */}
      <SectionPanel color="accent" icon={ShieldCheck} title="認証情報" className="mb-6">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <div className="flex gap-3 border-b border-neutral-100 py-1.5">
            <dt className="w-28 flex-none text-body-sm text-neutral-500">メールアドレス</dt>
            <dd className="min-w-0 break-all text-body-sm text-neutral-900">{user.email || "—"}</dd>
          </div>
          <div className="flex gap-3 border-b border-neutral-100 py-1.5">
            <dt className="w-28 flex-none text-body-sm text-neutral-500">ユーザーID</dt>
            <dd className="min-w-0 break-all font-mono text-body-sm text-neutral-900">{user.id}</dd>
          </div>
        </dl>
        <p className="mt-2 text-label-sm text-neutral-500">
          メールアドレス・ユーザーIDは認証に使われるため変更できません。
        </p>
      </SectionPanel>

      {/* 基本情報（編集可） */}
      <SectionPanel color="primary" icon={UserCog} title="基本情報" className="mb-6">
        {msg && (
          <div className="mb-4">
            <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="氏名" required>
            <div className="flex gap-2">
              <Input value={name} disabled={pending} onChange={(e) => setName(e.target.value)} />
              <Button
                variant="secondary"
                size="md"
                disabled={pending || !name.trim() || name.trim() === user.name}
                onClick={() => run(() => setUserName(user.id, name), "氏名を変更しました。")}
              >
                保存
              </Button>
            </div>
          </Field>

          <Field label="所属">
            <Select
              value={user.branchId ?? ""}
              disabled={pending}
              onChange={(e) => run(() => setUserBranch(user.id, e.target.value), "所属を変更しました。")}
            >
              <option value="">未設定</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="部">
            <Select
              value={user.division}
              disabled={pending}
              onChange={(e) => run(() => setUserDivision(user.id, e.target.value), "部を変更しました。")}
            >
              {DIVISION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="権限">
            <Select
              value={user.role}
              disabled={pending}
              onChange={(e) =>
                run(() => setUserRole(user.id, e.target.value), "権限を変更しました。次回ログインで反映されます。")
              }
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="mt-2 text-label-sm text-neutral-500">
          ※「所属代表者」はメニュー権限です。担当拠点は「拠点マスタ」で設定します。
        </p>
      </SectionPanel>
    </>
  );
}
