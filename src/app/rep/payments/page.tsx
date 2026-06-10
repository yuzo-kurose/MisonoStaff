import { getRoster } from "@/lib/queries/roster";
import { RepPaymentsClient, type PayRow } from "./RepPaymentsClient";

export default async function RepPaymentsPage() {
  const groups = await getRoster();
  const rows: PayRow[] = groups.flatMap((g) =>
    g.members
      .filter((m) => m.status === "confirmed" || m.status === "paid")
      .map((m) => ({
        participantId: m.participantId,
        name: m.name,
        eventName: g.eventName,
        amount: m.amount,
        status: m.status,
      })),
  );
  return <RepPaymentsClient rows={rows} />;
}
