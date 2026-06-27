"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guard";
import type { ParticipantStatus } from "@/types/database";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  division: string;
  branchName: string | null;
  status: string;
};

/** 全ユーザー一覧（管理者のみ）。profiles＋auth のメールを突き合わせる。 */
export async function getAllUsers(): Promise<AdminUserRow[]> {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return [];
  const admin = createAdminClient();

  const [{ data: profs }, { data: brs }] = await Promise.all([
    admin
      .from("profiles")
      .select("id,name,role,division,branch_id,status")
      .order("name", { ascending: true }),
    admin.from("branches").select("id,name"),
  ]);
  const profiles = (profs ?? []) as unknown as {
    id: string;
    name: string;
    role: string;
    division: string;
    branch_id: string | null;
    status: string;
  }[];
  const branches = (brs ?? []) as unknown as { id: string; name: string }[];

  // メールは auth から（ページング）
  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    data.users.forEach((u) => emails.set(u.id, u.email ?? ""));
    if (data.users.length < 200) break;
  }

  return profiles.map((p) => ({
    id: p.id,
    name: p.name,
    email: emails.get(p.id) ?? "",
    role: p.role,
    division: p.division,
    branchName: branches.find((b) => b.id === p.branch_id)?.name ?? null,
    status: p.status,
  }));
}

/** ユーザーの部(division)を変更（管理者のみ）。部の異動に対応。 */
export async function setUserDivision(
  userId: string,
  division: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const valid = ["student", "university", "adult", "mens", "general"];
  if (!valid.includes(division)) return { ok: false, error: "不正な部です。" };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ division } as never).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

/** ユーザーの権限ロールを変更（管理者のみ）。profiles.role を更新→トリガで app_metadata 同期。 */
export async function setUserRole(
  userId: string,
  role: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const valid = ["participant", "representative", "admin", "reception"];
  if (!valid.includes(role)) return { ok: false, error: "不正な権限です。" };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role } as never).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export type UserHistoryRow = {
  participantId: string;
  eventName: string;
  eventDate: string;
  branchName: string;
  status: ParticipantStatus;
  amount: number;
  appliedAt: string | null;
  cancelledAt: string | null;
};

export type UserDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  division: string;
  branchName: string | null;
};

/** 指定ユーザーの詳細＋申込履歴（キャンセル含む全件・管理者のみ）。 */
export async function getUserHistory(
  userId: string,
): Promise<{ user: UserDetail; rows: UserHistoryRow[] } | null> {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return null;
  const admin = createAdminClient();

  const { data: prof } = await admin
    .from("profiles")
    .select("name,role,division,branch_id")
    .eq("id", userId)
    .single();
  const p = prof as { name: string; role: string; division: string; branch_id: string | null } | null;

  // メール（認証情報）と所属拠点名を取得する。
  let email = "";
  try {
    const { data: au } = await admin.auth.admin.getUserById(userId);
    email = au.user?.email ?? "";
  } catch {
    // 取得失敗時は空（致命的でない）。
  }
  let branchName: string | null = null;
  if (p?.branch_id) {
    const { data: b } = await admin.from("branches").select("name").eq("id", p.branch_id).maybeSingle();
    branchName = (b as { name: string } | null)?.name ?? null;
  }

  const user: UserDetail = {
    id: userId,
    name: p?.name ?? "（不明）",
    email,
    role: p?.role ?? "participant",
    division: p?.division ?? "",
    branchName,
  };

  const { data: partData } = await admin
    .from("participants")
    .select("id,application_id,status,total_amount,created_at,cancelled_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const participants = (partData ?? []) as unknown as {
    id: string;
    application_id: string;
    status: ParticipantStatus;
    total_amount: number;
    created_at: string | null;
    cancelled_at: string | null;
  }[];
  if (participants.length === 0) return { user, rows: [] };

  const { data: apps } = await admin
    .from("applications")
    .select("id,event_id,branch_id")
    .in("id", [...new Set(participants.map((p) => p.application_id))]);
  const appList = (apps ?? []) as unknown as { id: string; event_id: string; branch_id: string }[];

  const [{ data: evs }, { data: brs }] = await Promise.all([
    admin.from("events").select("id,name,event_date").in("id", [...new Set(appList.map((a) => a.event_id))]),
    admin.from("branches").select("id,name").in("id", [...new Set(appList.map((a) => a.branch_id))]),
  ]);
  const events = (evs ?? []) as unknown as { id: string; name: string; event_date: string }[];
  const branches = (brs ?? []) as unknown as { id: string; name: string }[];

  const rows: UserHistoryRow[] = participants.map((p) => {
    const app = appList.find((a) => a.id === p.application_id);
    const ev = events.find((e) => e.id === app?.event_id);
    return {
      participantId: p.id,
      eventName: ev?.name ?? "（不明なイベント）",
      eventDate: ev?.event_date ?? "",
      branchName: branches.find((b) => b.id === app?.branch_id)?.name ?? "",
      status: p.status,
      amount: p.total_amount,
      appliedAt: p.created_at,
      cancelledAt: p.cancelled_at,
    };
  });

  return { user, rows };
}
