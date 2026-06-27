"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Table, Th, Td } from "@/components/ui/Table";
import { MobileRecord } from "@/components/ui/MobileRecord";
import { type AdminUserRow } from "./actions";

const DIVISION_LABEL: Record<string, string> = {
  student: "学生部",
  university: "大学生部",
  adult: "成人部",
  mens: "男子部",
  general: "一般",
};
const ROLE_LABEL: Record<string, string> = {
  participant: "ユーザー",
  representative: "所属代表者",
  admin: "管理者",
  reception: "受付",
};

export function UsersClient({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");

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

  const divisionLabel = (u: AdminUserRow) => DIVISION_LABEL[u.division] ?? "—";
  const roleLabel = (u: AdminUserRow) => ROLE_LABEL[u.role] ?? u.role;

  const detailButton = (u: AdminUserRow) => (
    <Link href={`/admin/users/${u.id}`}>
      <Button variant="secondary" size="sm">
        詳細 <ChevronRight size={15} />
      </Button>
    </Link>
  );

  return (
    <>
      <PageHeader
        title="全ユーザー一覧"
        description="氏名・所属・部を一覧表示します。メール・権限の確認や変更は「詳細」から行えます。"
      />

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

      {/* スマホ：カード（折りたたみ＝氏名・所属・部／展開＝メール・権限） */}
      <div className="space-y-2 md:hidden">
        {filtered.map((u) => (
          <MobileRecord
            key={u.id}
            title={u.name}
            subtitle={`${u.branchName ?? "所属未設定"} ・ ${divisionLabel(u)}`}
            rows={[
              { label: "メール", value: <span className="break-all">{u.email || "—"}</span> },
              { label: "権限", value: roleLabel(u) },
            ]}
            action={detailButton(u)}
          />
        ))}
      </div>

      {/* PC：テーブル（横スクロールさせずコンテナ幅に収める） */}
      <div className="hidden md:block">
        <Table
          scroll={false}
          head={
            <tr>
              <Th className="break-words">氏名</Th>
              <Th className="break-words">所属</Th>
              <Th className="break-words">部</Th>
              <Th className="break-words">メール</Th>
              <Th className="break-words">権限</Th>
              <Th className="break-words">操作</Th>
            </tr>
          }
        >
          {filtered.map((u) => (
            <tr key={u.id}>
              <Td className="break-words">{u.name}</Td>
              <Td className="break-words">{u.branchName ?? <span className="text-neutral-400">—</span>}</Td>
              <Td className="break-words">{divisionLabel(u)}</Td>
              <Td className="break-all">{u.email || <span className="text-neutral-400">—</span>}</Td>
              <Td className="break-words">{roleLabel(u)}</Td>
              <Td>{detailButton(u)}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}
