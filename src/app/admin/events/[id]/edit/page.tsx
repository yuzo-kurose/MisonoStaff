import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/Card";
import { getEventWithForm } from "@/lib/queries/events";
import { getDepartmentNames } from "@/lib/queries/departments";
import { getBranches } from "@/lib/queries/branches";
import { getFormTemplates } from "@/app/admin/forms/[eventId]/actions";
import { FormBuilderClient, type ClientField } from "@/app/admin/forms/[eventId]/FormBuilderClient";
import { EditEventClient } from "./EditEventClient";
import type { EventFormInitial } from "../../EventForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, departments, branchesRaw, templates] = await Promise.all([
    getEventWithForm(id),
    getDepartmentNames(),
    getBranches(),
    getFormTemplates(),
  ]);
  const branchNames = branchesRaw.map((b) => b.name);

  if (!event) {
    return (
      <>
        <Alert variant="error">イベントが見つかりません。</Alert>
        <div className="mt-4">
          <Link href="/admin/events" className="text-link underline">
            イベント一覧へ戻る
          </Link>
        </div>
      </>
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

  // DB形（snake_case）→ ビルダー形へ変換
  const initialFields: ClientField[] = event.fields.map((f) => ({
    id: f.id,
    label: f.label,
    fieldType: f.field_type,
    required: f.is_required,
    priceCalc: f.price_calc_type,
    unitPrice: f.unit_price ?? undefined,
    fieldKey: f.field_key ?? null,
    options: f.options.map((o) => ({ id: o.id, label: o.label, price: o.price ?? undefined })),
  }));

  return (
    <>
      <PageHeader
        title={`イベント編集：${event.name}`}
        description="開催情報と申込フォームをこの画面でまとめて編集します。"
      />

      {/* 基本情報 */}
      <section className="mb-10">
        <EditEventClient eventId={id} initial={initial} />
      </section>

      {/* 申込フォーム */}
      <section className="border-t border-neutral-200 pt-8">
        <h2 className="mb-1 text-heading-lg text-neutral-900">申込フォーム</h2>
        <p className="mb-6 text-body-sm text-neutral-600">
          このイベント専用の申込フォームです。項目の追加・並び替え・金額連動・説明文を設定できます。
        </p>
        <FormBuilderClient
          embedded
          eventName={event.name}
          formId={event.form_id}
          formName={event.formName}
          formDescription={event.formDescription}
          initialFields={initialFields}
          departments={departments}
          branchNames={branchNames}
          templates={templates}
        />
      </section>
    </>
  );
}
