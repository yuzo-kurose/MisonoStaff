import { createClient } from "@/lib/supabase/server";
import type { ParticipantStatus } from "@/types/database";

export type AppRow = {
  participantId: string;
  name: string;
  department: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  branchId: string;
  branchName: string;
  status: ParticipantStatus;
  amount: number;
  refundable: boolean; // 支払済 かつ 開催前日まで
};

/** 管理者：全申込（人単位明細）。 */
export async function getAdminApplications(): Promise<AppRow[]> {
  const supabase = await createClient();

  const { data: partData } = await supabase
    .from("participants")
    .select("id,application_id,user_id,status,total_amount");
  const participants = (partData ?? []) as unknown as {
    id: string;
    application_id: string;
    user_id: string;
    status: ParticipantStatus;
    total_amount: number;
  }[];
  if (participants.length === 0) return [];

  const [{ data: apps }, { data: profs }] = await Promise.all([
    supabase
      .from("applications")
      .select("id,event_id,branch_id")
      .in("id", [...new Set(participants.map((p) => p.application_id))]),
    supabase
      .from("profiles")
      .select("id,name,department")
      .in("id", [...new Set(participants.map((p) => p.user_id))]),
  ]);
  const appList = (apps ?? []) as unknown as { id: string; event_id: string; branch_id: string }[];
  const names = (profs ?? []) as unknown as { id: string; name: string; department: string | null }[];

  const [{ data: evs }, { data: brs }] = await Promise.all([
    supabase.from("events").select("id,name,event_date").in("id", [...new Set(appList.map((a) => a.event_id))]),
    supabase.from("branches").select("id,name").in("id", [...new Set(appList.map((a) => a.branch_id))]),
  ]);
  const events = (evs ?? []) as unknown as { id: string; name: string; event_date: string }[];
  const branches = (brs ?? []) as unknown as { id: string; name: string }[];

  const today = new Date().toISOString().slice(0, 10);

  return participants.map((p) => {
    const app = appList.find((a) => a.id === p.application_id);
    const ev = events.find((e) => e.id === app?.event_id);
    const eventDate = ev?.event_date ?? "";
    const prof = names.find((n) => n.id === p.user_id);
    return {
      participantId: p.id,
      name: prof?.name ?? "（不明）",
      department: prof?.department ?? "",
      eventId: app?.event_id ?? "",
      eventName: ev?.name ?? "（不明）",
      eventDate,
      branchId: app?.branch_id ?? "",
      branchName: branches.find((b) => b.id === app?.branch_id)?.name ?? "",
      status: p.status,
      amount: p.total_amount,
      refundable: p.status === "paid" && eventDate > today, // 前日まで全額・当日不可
    };
  });
}
