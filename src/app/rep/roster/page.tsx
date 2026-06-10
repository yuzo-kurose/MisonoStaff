import { getRoster } from "@/lib/queries/roster";
import { RosterClient } from "./RosterClient";

export default async function RosterPage() {
  const groups = await getRoster();
  return <RosterClient groups={groups} />;
}
