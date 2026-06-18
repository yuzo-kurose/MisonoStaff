"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import {
  EventForm,
  type EventBranchOption,
  type EventFormInitial,
  type EventFormPayload,
} from "../EventForm";
import { createEvent } from "./actions";

export function NewEventClient({
  branches,
  initial,
}: {
  branches: EventBranchOption[];
  initial: EventFormInitial;
}) {
  const router = useRouter();

  const onSubmit = async (payload: EventFormPayload) => {
    const res = await createEvent(payload);
    if (res.ok && res.eventId) {
      router.push(`/admin/forms/${res.eventId}`);
      router.refresh();
    }
    return res;
  };

  return (
    <AppShell role="admin">
      <PageHeader
        title="イベントを作成"
        description="ステップ 1 / 2 ・ 開催情報を設定 → 作成後に申込フォームを編集します。"
      />
      <EventForm
        initial={initial}
        branches={branches}
        submitLabel="作成してフォームを編集へ"
        pendingLabel="作成中…"
        actionNote="作成後、このイベント専用の申込フォーム編集へ進みます"
        cancelHref="/admin/events"
        onSubmit={onSubmit}
      />
    </AppShell>
  );
}
