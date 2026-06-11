"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, X, Pencil, Building2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Th, Td } from "@/components/ui/Table";
import { createBranch, updateBranch } from "./actions";

export type BranchRow = {
  id: string;
  name: string;
  representative_user_id: string | null;
  representativeName: string | null;
};

export function BranchesClient({
  branches,
  candidates,
}: {
  branches: BranchRow[];
  candidates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 新規追加
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRep, setNewRep] = useState("");

  // 行編集（拠点名・代表者）
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRep, setEditRep] = useState("");

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okText: string,
    done?: () => void,
  ) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        done?.();
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "処理に失敗しました。" });
      }
    });
  };

  const startEdit = (b: BranchRow) => {
    setEditId(b.id);
    setEditName(b.name);
    setEditRep(b.representative_user_id ?? "");
  };

  const repSelect = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">未設定</option>
      {candidates.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  );

  return (
    <AppShell role="admin">
      <PageHeader
        title="拠点マスタ"
        description="全国の拠点を登録・編集。拠点ごとに代表者を設定します（イベント横断で共有）。"
        action={
          <Button onClick={() => setAdding((v) => !v)}>
            <Plus size={18} /> 拠点を追加
          </Button>
        }
      />

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      {adding && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-neutral-white p-4 shadow-sm">
          <div className="w-56">
            <label className="text-label-md text-neutral-900">拠点名</label>
            <div className="mt-1.5">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="本部" />
            </div>
          </div>
          <div className="w-56">
            <label className="text-label-md text-neutral-900">代表者</label>
            <div className="mt-1.5">{repSelect(newRep, setNewRep)}</div>
          </div>
          <Button
            disabled={pending}
            onClick={() =>
              run(
                () => createBranch({ name: newName, representativeUserId: newRep }),
                "拠点を追加しました。",
                () => {
                  setAdding(false);
                  setNewName("");
                  setNewRep("");
                },
              )
            }
          >
            追加
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setAdding(false)}>
            キャンセル
          </Button>
        </div>
      )}

      {branches.length > 0 && (
      <Table
        head={
          <tr>
            <Th>拠点名</Th>
            <Th>代表者名</Th>
            <Th>操作</Th>
          </tr>
        }
      >
        {branches.map((b) => {
          const isEditing = editId === b.id;
          return (
            <tr key={b.id}>
              <Td>
                {isEditing ? (
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                ) : (
                  b.name
                )}
              </Td>
              <Td>
                {isEditing ? repSelect(editRep, setEditRep) : (b.representativeName ?? "未設定")}
              </Td>
              <Td>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="md"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              updateBranch(b.id, {
                                name: editName,
                                representativeUserId: editRep,
                              }),
                            "拠点を更新しました。",
                            () => setEditId(null),
                          )
                        }
                      >
                        <Check size={16} /> 保存
                      </Button>
                      <Button variant="ghost" size="md" aria-label="取消" onClick={() => setEditId(null)}>
                        <X size={16} />
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="md" onClick={() => startEdit(b)}>
                      <Pencil size={15} /> 編集
                    </Button>
                  )}
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
      )}

      {branches.length === 0 && (
        <EmptyState
          icon={Building2}
          title="拠点がまだありません"
          description="「拠点を追加」から、全国の拠点を登録してください。拠点ごとに代表者を設定できます。"
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus size={18} /> 拠点を追加
            </Button>
          }
        />
      )}
    </AppShell>
  );
}
