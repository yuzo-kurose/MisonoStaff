"use client";

import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { EventForm, type EventFormInitial, type EventFormPayload } from "../../EventForm";
import { updateEvent } from "./actions";

export function EditEventClient({
  eventId,
  initial,
}: {
  eventId: string;
  initial: EventFormInitial;
}) {
  const router = useRouter();

  // 基本情報はその場保存（フォーム編集と同一画面のため遷移しない）。
  const onSubmit = async (payload: EventFormPayload) => {
    const res = await updateEvent(eventId, payload);
    if (res.ok) {
      toast("基本情報を保存しました。");
      router.refresh();
    }
    return res;
  };

  return (
    <EventForm
      embedded
      initial={initial}
      submitLabel="基本情報を保存"
      pendingLabel="保存中…"
      cancelHref="/admin/events"
      onSubmit={onSubmit}
    />
  );
}
