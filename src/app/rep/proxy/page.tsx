import { getPublishedEvents } from "@/lib/queries/events";
import { divisions, departments } from "@/lib/mock/data";
import { ProxyClient } from "./ProxyClient";

export default async function ProxyPage() {
  const events = await getPublishedEvents();
  return (
    <ProxyClient
      events={events.map((e) => ({ id: e.id, name: e.name, venue: e.venue }))}
      divisions={divisions.map((d) => ({ value: d.value, label: d.label }))}
      departments={[...departments]}
    />
  );
}
