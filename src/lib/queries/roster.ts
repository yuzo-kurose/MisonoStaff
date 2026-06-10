import { createClient } from "@/lib/supabase/server";
import type { ParticipantStatus } from "@/types/database";

export type RosterMember = {
  participantId: string;
  name: string;
  status: ParticipantStatus;
  amount: number;
};
export type RosterGroup = {
  applicationId: string;
  eventName: string;
  eventDate: string;
  branchName: string;
  applicationStatus: "open" | "confirmed";
  members: RosterMember[];
};

/**
 * 名簿（application＝イベント×拠点 単位）。
 * - 代表者：自分が代表の拠点のみ
 * - 管理者：全拠点
 */
export async function getRoster(): Promise<RosterGroup[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role: string } | null)?.role;
  const isAdmin = role === "admin";

  // 対象の applications
  let appsQuery = supabase.from("applications").select("id,event_id,branch_id,status");
  if (!isAdmin) {
    const { data: repBranches } = await supabase
      .from("branches")
      .select("id")
      .eq("representative_user_id", user.id);
    const branchIds = ((repBranches ?? []) as unknown as { id: string }[]).map((b) => b.id);
    if (branchIds.length === 0) return [];
    appsQuery = appsQuery.in("branch_id", branchIds);
  }
  const { data: appsData } = await appsQuery;
  const apps = (appsData ?? []) as unknown as {
    id: string;
    event_id: string;
    branch_id: string;
    status: "open" | "confirmed";
  }[];
  if (apps.length === 0) return [];

  const { data: partData } = await supabase
    .from("participants")
    .select("id,application_id,user_id,status,total_amount")
    .in(
      "application_id",
      apps.map((a) => a.id),
    )
    .neq("status", "cancelled");
  const participants = (partData ?? []) as unknown as {
    id: string;
    application_id: string;
    user_id: string;
    status: ParticipantStatus;
    total_amount: number;
  }[];

  const [{ data: profs }, { data: evs }, { data: brs }] = await Promise.all([
    supabase.from("profiles").select("id,name").in("id", [...new Set(participants.map((p) => p.user_id))]),
    supabase.from("events").select("id,name,event_date").in("id", [...new Set(apps.map((a) => a.event_id))]),
    supabase.from("branches").select("id,name").in("id", [...new Set(apps.map((a) => a.branch_id))]),
  ]);
  const names = (profs ?? []) as unknown as { id: string; name: string }[];
  const events = (evs ?? []) as unknown as { id: string; name: string; event_date: string }[];
  const branches = (brs ?? []) as unknown as { id: string; name: string }[];

  return apps
    .map((a) => {
      const ev = events.find((e) => e.id === a.event_id);
      const members = participants
        .filter((p) => p.application_id === a.id)
        .map((p) => ({
          participantId: p.id,
          name: names.find((n) => n.id === p.user_id)?.name ?? "（不明）",
          status: p.status,
          amount: p.total_amount,
        }));
      return {
        applicationId: a.id,
        eventName: ev?.name ?? "（不明なイベント）",
        eventDate: ev?.event_date ?? "",
        branchName: branches.find((b) => b.id === a.branch_id)?.name ?? "",
        applicationStatus: a.status,
        members,
      };
    })
    .filter((g) => g.members.length > 0)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}
