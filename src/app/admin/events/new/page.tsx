import { getBranches } from "@/lib/queries/branches";
import { newEventInitial } from "../EventForm";
import { NewEventClient } from "./NewEventClient";

export default async function NewEventPage() {
  const branchesRaw = await getBranches();
  const branches = branchesRaw.map((b) => ({ id: b.id, name: b.name, region: b.region ?? null }));
  // 既定で全拠点を選択（基本は全拠点から申込受付）。
  const initial = { ...newEventInitial, selectedBranchIds: branches.map((b) => b.id) };

  return <NewEventClient branches={branches} initial={initial} />;
}
