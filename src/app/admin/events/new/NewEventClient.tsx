"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/Card";
import { EventForm, newEventInitial, type EventFormPayload } from "../EventForm";
import { createEvent } from "./actions";

export function NewEventClient() {
  const router = useRouter();

  const onSubmit = async (payload: EventFormPayload) => {
    const res = await createEvent(payload);
    if (res.ok && res.eventId) {
      router.push(`/admin/events/${res.eventId}/edit`);
      router.refresh();
    }
    return res;
  };

  return (
    <>
      <PageHeader
        title="イベントを作成"
        description="開催情報を設定して作成します。作成後、同じ編集画面で申込フォームを設定できます。"
      />
      <EventForm
        initial={newEventInitial}
        submitLabel="作成して編集へ"
        pendingLabel="作成中…"
        actionNote="作成後、編集画面で申込フォームを設定できます"
        cancelHref="/admin/events"
        onSubmit={onSubmit}
      />
    </>
  );
}
