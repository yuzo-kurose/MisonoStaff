"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { jpDate } from "@/lib/format";
import type { Announcement, AnnouncementLevel } from "@/types/database";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type AnnouncementInput,
} from "./actions";

const empty: AnnouncementInput = { level: "info", title: "", body: "", is_published: true };
const levelLabel: Record<AnnouncementLevel, string> = { important: "重要", info: "お知らせ" };

export function AnnouncementsClient({ items }: { items: Announcement[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null); // null=未編集, "new"=新規
  const [form, setForm] = useState<AnnouncementInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof AnnouncementInput>(k: K, v: AnnouncementInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function openNew() {
    setForm(empty);
    setEditingId("new");
    setError(null);
  }
  function openEdit(a: Announcement) {
    setForm({ level: a.level, title: a.title, body: a.body, is_published: a.is_published });
    setEditingId(a.id);
    setError(null);
  }
  function close() {
    setEditingId(null);
    setError(null);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res =
        editingId === "new"
          ? await createAnnouncement(form)
          : await updateAnnouncement(editingId!, form);
      if (!res.ok) {
        setError(res.error ?? "保存に失敗しました。");
        return;
      }
      close();
      router.refresh();
    });
  }

  function onDelete(a: Announcement) {
    if (!window.confirm(`「${a.title}」を削除します。よろしいですか？`)) return;
    start(async () => {
      const res = await deleteAnnouncement(a.id);
      if (!res.ok) {
        window.alert(res.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    });
  }

  const editing = editingId !== null;

  return (
    <div className="space-y-4">
      {!editing && (
        <div className="flex justify-end">
          <Button onClick={openNew}>
            <Plus size={16} />
            新規作成
          </Button>
        </div>
      )}

      {editing && (
        <Card>
          <CardTitle>{editingId === "new" ? "連絡事項を作成" : "連絡事項を編集"}</CardTitle>
          <form className="mt-4 space-y-4" onSubmit={onSave}>
            {error && <Alert variant="error">{error}</Alert>}
            <Field label="種別" required>
              <Select
                value={form.level}
                onChange={(e) => set("level", e.target.value as AnnouncementLevel)}
              >
                <option value="info">お知らせ</option>
                <option value="important">重要</option>
              </Select>
            </Field>
            <Field label="タイトル" required>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="本文" required>
              <Textarea value={form.body} onChange={(e) => set("body", e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-body-sm text-neutral-900">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => set("is_published", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-400 text-primary-700"
              />
              公開する（オフにすると下書きとして保存され、ホームに表示されません）
            </label>
            <div className="flex gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? "保存中…" : "保存する"}
              </Button>
              <Button type="button" variant="secondary" onClick={close} disabled={pending}>
                キャンセル
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!editing && (
        <Card>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-neutral-100 text-neutral-400">
                <Megaphone size={22} />
              </span>
              <p className="text-body-md text-neutral-600">連絡事項はまだありません。</p>
              <p className="text-body-sm text-neutral-500">
                「新規作成」からホームに表示するお知らせを追加できます。
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {items.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={a.level === "important" ? "error" : "info"}>
                        {levelLabel[a.level]}
                      </Badge>
                      {!a.is_published && <Badge variant="neutral">下書き</Badge>}
                      <time className="text-label-sm text-neutral-500">{jpDate(a.published_at)}</time>
                    </div>
                    <p className="mt-1 text-body-md text-neutral-900">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-body-sm text-neutral-600">{a.body}</p>
                  </div>
                  <div className="flex flex-none gap-1">
                    <Button variant="ghost" onClick={() => openEdit(a)} disabled={pending}>
                      <Pencil size={15} />
                      編集
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onDelete(a)}
                      disabled={pending}
                      className="text-error-900 hover:bg-error-100"
                    >
                      <Trash2 size={15} />
                      削除
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
