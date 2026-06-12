import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { Profile, Participant, EventRow } from "@/types/database";

/** ログイン中ユーザーのプロフィール（未ログインなら null） */
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
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
  const user = await getCurrentUser();
  if (!user) return [];

  // participants → applications → events を FK リレーション埋め込みで1往復で取得する。
  // （以前は participants/applications/events を直列に3往復していた）
  // application_id・event_id は NOT NULL なので !inner で取りこぼさない。
  const { data } = await supabase
    .from("participants")
    .select("id,status,total_amount,applications!inner(events!inner(name,event_date,venue))")
    .eq("user_id", user.id);

  const rows = (data ?? []) as unknown as {
    id: string;
    status: Participant["status"];
    total_amount: number;
    applications: { events: Pick<EventRow, "name" | "event_date" | "venue"> | null } | null;
  }[];

  return rows.map((p) => {
    const ev = p.applications?.events ?? null;
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
