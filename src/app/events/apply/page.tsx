import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { getEventWithForm } from "@/lib/queries/events";
import { getMyProfile } from "@/lib/queries/me";
import { getBranches } from "@/lib/queries/branches";
import { divisions } from "@/lib/mock/data";
import { getMyExistingApplications } from "./actions";
import { ApplyClient, type ApplyEvent } from "./ApplyClient";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const eventIds = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  if (eventIds.length === 0) {
    return (
      <AppShell role="participant">
        <Alert variant="info">
          イベントが選択されていません。
          <Link href="/events" className="ml-1 text-link underline">
            イベント一覧へ
          </Link>
        </Alert>
      </AppShell>
    );
  }

  const [profile, branches, existing, ...eventsRaw] = await Promise.all([
    getMyProfile(),
    getBranches(),
    getMyExistingApplications(eventIds),
    ...eventIds.map((id) => getEventWithForm(id)),
  ]);
  // 既存申込があればその拠点を初期選択（編集時に拠点を保つ）。
  const existingBranchId = Object.values(existing)[0]?.branchId;

  const events: ApplyEvent[] = eventsRaw
    .filter((e): e is NonNullable<typeof e> => !!e)
    .map((e) => ({
      id: e.id,
      name: e.name,
      eventDate: e.event_date,
      venue: e.venue,
      fields: e.fields.map((f) => ({
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
      })),
    }));

  return (
    <ApplyClient
      events={events}
      profileName={profile?.name ?? ""}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      defaultBranchId={existingBranchId ?? profile?.branch_id ?? ""}
      divisions={divisions.map((d) => ({ value: d.value, label: d.label }))}
      defaultDivision={profile?.division ?? ""}
      existing={existing}
    />
  );
}
