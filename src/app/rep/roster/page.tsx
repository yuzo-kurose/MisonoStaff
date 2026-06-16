import { getRoster } from "@/lib/queries/roster";
import { getAuthContext } from "@/lib/auth/guard";
import { RosterClient } from "./RosterClient";

export default async function RosterPage() {
  const [groups, { role }] = await Promise.all([getRoster(), getAuthContext()]);
  return <RosterClient groups={groups} isAdmin={role === "admin"} />;
}
