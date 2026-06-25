"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, X, Pencil, Trash2, Tags } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Th, Td } from "@/components/ui/Table";
import { createDepartment, updateDepartment, deleteDepartment } from "./actions";

export type DeptRow = { id: string; name: string };

export function DepartmentsClient({ departments }: { departments: DeptRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 新規追加
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  // 行編集
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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

  const startEdit = (d: DeptRow) => {
    setEditId(d.id);
    setEditName(d.name);
  };

  const onDelete = (d: DeptRow) => {
    if (
      !confirm(
        `部署「${d.name}」を選択肢から削除します。よろしいですか？\n（既にこの部署が設定されている方の表示は変わりません）`,
      )
    )
      return;
    run(() => deleteDepartment(d.id), "部署を削除しました。");
  };

  return (
    <>
      <PageHeader
        title="部署マスタ"
        description="当日の配置先（部署）の選択肢を管理します。ここで追加した部署が登録・代行入力・マイページのプルダウンに表示されます。"
        action={
          <Button onClick={() => setAdding((v) => !v)}>
            <Plus size={18} /> 部署を追加
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
          <div className="w-64">
            <label className="text-label-md text-neutral-900">部署名</label>
            <div className="mt-1.5">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：天門"
                autoFocus
              />
            </div>
          </div>
          <Button
            disabled={pending}
            onClick={() =>
              run(() => createDepartment(newName), "部署を追加しました。", () => {
                setAdding(false);
                setNewName("");
              })
            }
          >
            追加
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setAdding(false)}>
            キャンセル
          </Button>
        </div>
      )}

      {departments.length > 0 && (
        <Table
          head={
            <tr>
              <Th>部署名</Th>
              <Th>操作</Th>
            </tr>
          }
        >
          {departments.map((d) => {
            const isEditing = editId === d.id;
            return (
              <tr key={d.id}>
                <Td>
                  {isEditing ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    d.name
                  )}
                </Td>
                <Td>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => updateDepartment(d.id, editName),
                              "部署を更新しました。",
                              () => setEditId(null),
                            )
                          }
                        >
                          <Check size={16} /> 保存
                        </Button>
                        <Button variant="secondary" size="sm" aria-label="取消" onClick={() => setEditId(null)}>
                          <X size={16} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => startEdit(d)}>
                          <Pencil size={15} /> 編集
                        </Button>
                        <Button
                          variant="dangerOutline"
                          size="sm"
                          disabled={pending}
                          onClick={() => onDelete(d)}
                        >
                          <Trash2 size={15} /> 削除
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      {departments.length === 0 && (
        <EmptyState
          icon={Tags}
          title="部署がまだありません"
          description="「部署を追加」から、当日の配置先（部署）の選択肢を登録してください。"
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus size={18} /> 部署を追加
            </Button>
          }
        />
      )}
    </>
  );
}
