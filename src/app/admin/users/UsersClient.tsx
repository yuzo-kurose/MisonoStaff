"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
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
  const [branchFilter, setBranchFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");

  // 絞り込み候補：登録済みユーザーの所属（重複排除）。
  const branchOptions = useMemo(
    () => [...new Set(users.map((u) => u.branchName).filter((b): b is string => !!b))].sort(),
    [users],
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (q === "" ||
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.id.toLowerCase().includes(q)) &&
          (branchFilter === "" || (u.branchName ?? "") === branchFilter) &&
          (divisionFilter === "" || u.division === divisionFilter),
      ),
    [users, q, branchFilter, divisionFilter],
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

      <div className="mb-4 space-y-3">
        {/* 1行目：所属・部 */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <label className="mb-1 block text-label-sm text-neutral-600">所属</label>
            <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="">すべて</option>
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <label className="mb-1 block text-label-sm text-neutral-600">部</label>
            <Select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)}>
              <option value="">すべて</option>
              {Object.entries(DIVISION_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {/* 2行目：名前（ID・氏名・メール）検索 */}
        <div className="max-w-md">
          <label className="mb-1 block text-label-sm text-neutral-600">名前で検索（ID・メールも可）</label>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="氏名 / ID / メール" className="pl-10" />
          </div>
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
