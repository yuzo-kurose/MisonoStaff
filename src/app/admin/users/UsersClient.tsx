"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, History } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Table, Th, Td } from "@/components/ui/Table";
import { MobileRecord } from "@/components/ui/MobileRecord";
import { setUserRole, setUserDivision, type AdminUserRow } from "./actions";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "participant", label: "ユーザー" },
  { value: "representative", label: "所属代表者" },
  { value: "admin", label: "管理者" },
  { value: "reception", label: "受付" },
];
const DIVISION_OPTIONS: { value: string; label: string }[] = [
  { value: "student", label: "学生部" },
  { value: "university", label: "大学生部" },
  { value: "adult", label: "成人部" },
  { value: "mens", label: "男子部" },
  { value: "general", label: "一般" },
];

export function UsersClient({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q === ""
        ? users
        : users.filter(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              u.id.toLowerCase().includes(q),
          ),
    [users, q],
  );

  const changeRole = (userId: string, role: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await setUserRole(userId, role);
      if (res.ok) {
        setMsg({
          ok: true,
          text: "権限を変更しました。対象ユーザーは次回ログインでメニューに反映されます。",
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: `変更に失敗：${res.error}` });
      }
    });
  };

  const changeDivision = (userId: string, division: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await setUserDivision(userId, division);
      if (res.ok) {
        setMsg({ ok: true, text: "部を変更しました。" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: `変更に失敗：${res.error}` });
      }
    });
  };

  const roleSelect = (u: AdminUserRow) => (
    <Select
      value={u.role}
      disabled={pending}
      onChange={(e) => changeRole(u.id, e.target.value)}
      className="max-w-[10rem]"
    >
      {ROLE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );

  const divisionSelect = (u: AdminUserRow) => (
    <Select
      value={u.division}
      disabled={pending}
      onChange={(e) => changeDivision(u.id, e.target.value)}
      className="max-w-[9rem]"
    >
      {DIVISION_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );

  const idCell = (u: AdminUserRow) => (
    <span className="font-mono text-label-sm text-neutral-500" title={u.id}>
      {u.id.slice(0, 8)}
    </span>
  );

  const historyButton = (u: AdminUserRow) => (
    <Link href={`/admin/users/${u.id}`}>
      <Button variant="secondary" size="sm">
        <History size={15} /> 申込履歴
      </Button>
    </Link>
  );

  return (
    <>
      <PageHeader
        title="全ユーザー一覧"
        description="ユーザーの権限を変更し、申込履歴を確認できます。"
      />

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      <div className="mb-4 max-w-md">
        <label className="mb-1 block text-label-sm text-neutral-600">ID・氏名・メールで検索</label>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ID / 氏名 / メール" className="pl-10" />
        </div>
      </div>

      <p className="mb-3 text-body-sm text-neutral-700">
        <span className="font-medium text-neutral-900">{filtered.length}</span> 名
      </p>

      {/* スマホ：カード */}
      <div className="space-y-2 md:hidden">
        {filtered.map((u) => (
          <MobileRecord
            key={u.id}
            title={u.name}
            rows={[
              { label: "ID", value: idCell(u) },
              { label: "メール", value: u.email || "—" },
              { label: "部", value: divisionSelect(u) },
              { label: "所属", value: u.branchName ?? "—" },
              { label: "権限", value: roleSelect(u) },
            ]}
            action={historyButton(u)}
          />
        ))}
      </div>

      {/* PC：テーブル */}
      <div className="hidden md:block">
        <Table
          head={
            <tr>
              <Th>ID</Th>
              <Th>氏名</Th>
              <Th>メール</Th>
              <Th>部</Th>
              <Th>所属</Th>
              <Th>権限</Th>
              <Th>操作</Th>
            </tr>
          }
        >
          {filtered.map((u) => (
            <tr key={u.id}>
              <Td>{idCell(u)}</Td>
              <Td>{u.name}</Td>
              <Td>{u.email || <span className="text-neutral-400">—</span>}</Td>
              <Td>{divisionSelect(u)}</Td>
              <Td>{u.branchName ?? <span className="text-neutral-400">—</span>}</Td>
              <Td>{roleSelect(u)}</Td>
              <Td>{historyButton(u)}</Td>
            </tr>
          ))}
        </Table>
      </div>

      <p className="mt-4 text-body-sm text-neutral-500">
        ※「所属代表者」はメニュー権限です。どの拠点の名簿を扱うかは「拠点マスタ」で代表者に設定してください。
        権限名：{ROLE_OPTIONS.map((o) => o.label).join(" / ")}
      </p>
    </>
  );
}
