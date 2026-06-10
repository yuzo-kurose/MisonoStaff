import { createClient } from "@/lib/supabase/server";
import type { Profile, Participant, EventRow } from "@/types/database";

/** ログイン中ユーザーのプロフィール（未ログインなら null） */
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as unknown as Profile | null) ?? null;
}

export type MyParticipation = {
  participantId: string;
  status: Participant["status"];
  amount: number;
  eventName: string;
  eventDate: string;
  venue: string | null;
};

/** ログイン中ユーザーの参加（申込）一覧 */
export async function getMyParticipations(): Promise<MyParticipation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: parts } = await supabase
    .from("participants")
    .select("id,application_id,status,total_amount")
    .eq("user_id", user.id);
  const participants = (parts ?? []) as unknown as {
    id: string;
    application_id: string;
    status: Participant["status"];
    total_amount: number;
  }[];
  if (participants.length === 0) return [];

  const appIds = [...new Set(participants.map((p) => p.application_id))];
  const { data: apps } = await supabase
    .from("applications")
    .select("id,event_id")
    .in("id", appIds);
  const appList = (apps ?? []) as unknown as { id: string; event_id: string }[];

  const eventIds = [...new Set(appList.map((a) => a.event_id))];
  const { data: evs } = await supabase
    .from("events")
    .select("id,name,event_date,venue")
    .in("id", eventIds);
  const events = (evs ?? []) as unknown as Pick<
    EventRow,
    "id" | "name" | "event_date" | "venue"
  >[];

  return participants.map((p) => {
    const app = appList.find((a) => a.id === p.application_id);
    const ev = events.find((e) => e.id === app?.event_id);
    return {
      participantId: p.id,
      status: p.status,
      amount: p.total_amount,
      eventName: ev?.name ?? "（不明なイベント）",
      eventDate: ev?.event_date ?? "",
      venue: ev?.venue ?? null,
    };
  });
}
