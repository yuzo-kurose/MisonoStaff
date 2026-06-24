"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/Card";
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

  const onSubmit = async (payload: EventFormPayload) => {
    const res = await updateEvent(eventId, payload);
    if (res.ok) {
      router.push("/admin/events");
      router.refresh();
    }
    return res;
  };

  return (
    <>
      <PageHeader
        title="イベントを編集"
        description="開催情報・料金・交通手段・対象拠点を変更します。フォーム項目の追加はフォーム編集画面から行えます。"
      />
      <EventForm
        initial={initial}
        submitLabel="変更を保存"
        pendingLabel="保存中…"
        actionNote="保存後、イベント一覧に戻ります"
        cancelHref="/admin/events"
        onSubmit={onSubmit}
      />
    </>
  );
}
