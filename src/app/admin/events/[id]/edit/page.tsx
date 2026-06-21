import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { getEventWithForm } from "@/lib/queries/events";
import { EditEventClient } from "./EditEventClient";
import type { EventFormInitial } from "../../EventForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventWithForm(id);

  if (!event) {
    return (
      <AppShell role="admin">
        <Alert variant="error">イベントが見つかりません。</Alert>
        <div className="mt-4">
          <Link href="/admin/events" className="text-link underline">
            イベント一覧へ戻る
          </Link>
        </div>
      </AppShell>
    );
  }

  const initial: EventFormInitial = {
    name: event.name,
    startDate: event.start_date ?? "",
    endDate: event.event_date,
    deadline: event.application_deadline,
    capacity: event.capacity != null ? String(event.capacity) : "",
    // 編集フォームの状態は下書き／公開のみ。締切(closed)は公開として表示する。
    status: event.status === "closed" ? "published" : event.status,
  };

  return <EditEventClient eventId={id} initial={initial} />;
}
