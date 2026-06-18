"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import {
  EventForm,
  newEventInitial,
  type EventBranchOption,
  type EventFormPayload,
} from "../EventForm";
import { createEvent } from "./actions";

export function NewEventClient({ branches }: { branches: EventBranchOption[] }) {
  const router = useRouter();

  // 既定で全拠点を選択（基本は全拠点から申込受付）。newEventInitial の参照・スプレッドは
  // クライアント側で行う（サーバーから "use client" モジュールの値をスプレッドすると壊れるため）。
  const initial = { ...newEventInitial, selectedBranchIds: branches.map((b) => b.id) };

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
