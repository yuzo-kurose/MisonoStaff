import { getMyParticipations } from "@/lib/queries/me";
import { PaymentClient, type PayItem } from "./PaymentClient";

export default async function PaymentPage() {
  const parts = await getMyParticipations();
  const items: PayItem[] = parts
    .filter((p) => p.status === "confirmed")
    .map((p) => ({
      participantId: p.participantId,
      eventName: p.eventName,
      eventDate: p.eventDate,
      venue: p.venue,
      amount: p.amount,
    }));
  return <PaymentClient items={items} />;
}
