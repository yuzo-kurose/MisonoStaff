"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";
import { SectionPanel } from "@/components/ui/SectionPanel";
import { Field, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { setUserRole, setUserDivision, type UserDetail } from "../actions";

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

/** ユーザー詳細：基本情報の表示＋部・権限の編集（管理者のみ）。 */
export function UserInfoClient({ user }: { user: UserDetail }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const changeRole = (role: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await setUserRole(user.id, role);
      setMsg(
        res.ok
          ? { ok: true, text: "権限を変更しました。対象ユーザーは次回ログインで反映されます。" }
          : { ok: false, text: `変更に失敗：${res.error}` },
      );
      if (res.ok) router.refresh();
    });
  };
  const changeDivision = (division: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await setUserDivision(user.id, division);
      setMsg(res.ok ? { ok: true, text: "部を変更しました。" } : { ok: false, text: `変更に失敗：${res.error}` });
      if (res.ok) router.refresh();
    });
  };

  const info: { label: string; value: string }[] = [
    { label: "氏名", value: user.name },
    { label: "メール", value: user.email || "—" },
    { label: "所属", value: user.branchName ?? "—" },
    { label: "ユーザーID", value: user.id },
  ];

  return (
    <SectionPanel color="primary" icon={UserCog} title="ユーザー情報" className="mb-6">
      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {info.map((r) => (
          <div key={r.label} className="flex gap-3 border-b border-neutral-100 py-1.5">
            <dt className="w-24 flex-none text-body-sm text-neutral-500">{r.label}</dt>
            <dd className="min-w-0 break-all text-body-sm text-neutral-900">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="部">
          <Select value={user.division} disabled={pending} onChange={(e) => changeDivision(e.target.value)}>
            {DIVISION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="権限">
          <Select value={user.role} disabled={pending} onChange={(e) => changeRole(e.target.value)}>
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
  );
}
