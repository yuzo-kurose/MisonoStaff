"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { restoreEvent } from "./actions";

/** 削除済みイベントを復元するボタン。 */
export function RestoreEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onRestore() {
    if (!window.confirm(`「${eventName}」を復元します。よろしいですか？`)) return;
    start(async () => {
      const res = await restoreEvent(eventId);
      if (!res.ok) {
        window.alert(res.error ?? "復元に失敗しました。");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end">
      <Button variant="ghost" onClick={onRestore} disabled={pending}>
        <RotateCcw size={15} />
        {pending ? "復元中…" : "復元"}
      </Button>
    </div>
  );
}
