import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { getEventWithForm, getEventBranchIds } from "@/lib/queries/events";
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

  const branchIds = await getEventBranchIds(id);

  // DBのフォーム項目（料金・交通手段）→ 作成画面の入力値に逆変換する。
  // 料金/交通手段は createEvent が決め打ちのラベルで作る3項目に格納されている。
  const field = (label: string) => event.fields.find((f) => f.label === label);
  const maxPrice = (opts: { price?: number | null }[]) =>
    opts.reduce((m, o) => Math.max(m, o.price ?? 0), 0);

  const lodgingField = field("スタッフ宿泊費");
  const outField = field("往路（交通手段）");
  const inField = field("復路（交通手段）");

  const lodgingFee =
    lodgingField?.options.find((o) => o.label === "宿泊する")?.price ??
    maxPrice(lodgingField?.options ?? []);

  const initial: EventFormInitial = {
    name: event.name,
    startDate: event.start_date ?? "",
    endDate: event.event_date,
    deadline: event.application_deadline,
    capacity: event.capacity != null ? String(event.capacity) : "",
    // 編集フォームの状態は下書き／公開のみ。締切(closed)は公開として表示する。
    status: event.status === "closed" ? "published" : event.status,
    lodging: String(lodgingFee),
    outFare: String(maxPrice(outField?.options ?? [])),
    inFare: String(maxPrice(inField?.options ?? [])),
    outbound: outField?.options.map((o) => o.label) ?? [],
    inbound: inField?.options.map((o) => o.label) ?? [],
    selectedBranchIds: branchIds,
  };

  return <EditEventClient eventId={id} initial={initial} />;
}
