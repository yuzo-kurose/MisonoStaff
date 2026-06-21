import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { getEventWithForm } from "@/lib/queries/events";
import { getDepartmentNames } from "@/lib/queries/departments";
import { getBranches } from "@/lib/queries/branches";
import { getFormTemplates } from "./actions";
import { FormBuilderClient, type ClientField } from "./FormBuilderClient";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [event, departments, branchesRaw, templates] = await Promise.all([
    getEventWithForm(eventId),
    getDepartmentNames(),
    getBranches(),
    getFormTemplates(),
  ]);
  const branchNames = branchesRaw.map((b) => b.name);

  if (!event) {
    return (
      <AppShell role="admin">
        <Alert variant="error">イベントが見つかりません。</Alert>
        <div className="mt-4">
          <Link href="/admin/forms" className="text-link underline">
            フォーム一覧へ戻る
          </Link>
        </div>
      </AppShell>
    );
  }

  // DB形（snake_case）→ ビルダー形へ変換
  const initialFields: ClientField[] = event.fields.map((f) => ({
    id: f.id,
    label: f.label,
    fieldType: f.field_type,
    required: f.is_required,
    priceCalc: f.price_calc_type,
    unitPrice: f.unit_price ?? undefined,
    options: f.options.map((o) => ({
      id: o.id,
      label: o.label,
      price: o.price ?? undefined,
    })),
  }));

  return (
    <FormBuilderClient
      eventName={event.name}
      formId={event.form_id}
      formName={event.formName}
      initialFields={initialFields}
      departments={departments}
      branchNames={branchNames}
      templates={templates}
    />
  );
}
