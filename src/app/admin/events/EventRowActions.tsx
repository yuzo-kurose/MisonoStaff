"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Copy, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { duplicateEvent, deleteEvent } from "./actions";

/** イベント一覧の行操作：編集・コピー・削除。削除は確認＋申込者ガード（actions側）。 */
export function EventRowActions({ eventId, eventName }: { eventId: string; eventName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete() {
    if (!window.confirm(`「${eventName}」を削除して一覧から非表示にします。よろしいですか？（後で復元できます）`)) return;
    start(async () => {
      const res = await deleteEvent(eventId);
      if (!res.ok) {
        window.alert(res.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Link href={`/admin/events/${eventId}/edit`}>
        <Button variant="secondary" size="sm">
          <Pencil size={15} />
          編集
        </Button>
      </Link>
      <Link href={`/admin/forms/${eventId}`}>
        <Button variant="secondary" size="sm">
          <FileText size={15} />
          フォーム
        </Button>
      </Link>
      <form action={duplicateEvent}>
        <input type="hidden" name="eventId" value={eventId} />
        <Button type="submit" variant="secondary" size="sm">
          <Copy size={15} />
          コピー
        </Button>
      </form>
      <Button variant="dangerOutline" size="sm" onClick={onDelete} disabled={pending}>
        <Trash2 size={15} />
        {pending ? "削除中…" : "削除"}
      </Button>
    </div>
  );
}
