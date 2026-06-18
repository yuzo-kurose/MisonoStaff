import { getBranches } from "@/lib/queries/branches";
import { NewEventClient } from "./NewEventClient";

export default async function NewEventPage() {
  const branchesRaw = await getBranches();
  const branches = branchesRaw.map((b) => ({ id: b.id, name: b.name, region: b.region ?? null }));
  return <NewEventClient branches={branches} />;
}
