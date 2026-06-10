import { getPublishedEvents } from "@/lib/queries/events";
import { EventsClient, type EventListItem } from "./EventsClient";

export default async function EventsPage() {
  const events = await getPublishedEvents();
  const items: EventListItem[] = events.map((e) => ({
    id: e.id,
    name: e.name,
    eventDate: e.event_date,
    venue: e.venue,
    deadline: e.application_deadline,
    capacity: e.capacity,
  }));
  return <EventsClient events={items} />;
}
