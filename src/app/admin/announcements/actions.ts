"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AnnouncementLevel } from "@/types/database";

export type AnnouncementInput = {
  level: AnnouncementLevel;
  title: string;
  body: string;
  is_published: boolean;
};

type Result = { ok: boolean; error?: string };

function validate(input: AnnouncementInput): string | null {
  if (!input.title.trim()) return "タイトルを入力してください。";
  if (!input.body.trim()) return "本文を入力してください。";
  if (input.level !== "important" && input.level !== "info") return "種別が不正です。";
  return null;
}

// 連絡事項の作成・更新・削除はすべて通常 client（ユーザーセッション）で実行し、
// RLS（ann_write_admin）で管理者のみに制限する。service_role は使わない。

export async function createAnnouncement(input: AnnouncementInput): Promise<Result> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const { error } = await supabase.from("announcements").insert({
    level: input.level,
    title: input.title.trim(),
    body: input.body.trim(),
    is_published: input.is_published,
    created_by: user.id,
  } as never);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return { ok: true };
}

export async function updateAnnouncement(id: string, input: AnnouncementInput): Promise<Result> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      level: input.level,
      title: input.title.trim(),
      body: input.body.trim(),
      is_published: input.is_published,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<Result> {
  if (!id) return { ok: false, error: "対象が不明です。" };
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/announcements");
  revalidatePath("/");
  return { ok: true };
}
