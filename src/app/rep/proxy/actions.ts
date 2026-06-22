"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guard";

export type ProxyMemberInput = {
  eventIds: string[];
  branchId: string; // 登録先拠点（代表者＝担当拠点／管理者＝任意の拠点）
  name: string;
  email: string;
  division: string;
  department?: string; // 配置先（任意）
};

/** 仮パスワード（本人が初回ログインで再設定する想定）。 */
function tempPassword(): string {
  return `${crypto.randomUUID()}Aa1!`;
}

/**
 * 代表者がメンバー1名分の申込を代行登録する。
 *  - service_role で確認済みアカウントを作成（created_via=proxy）
 *  - 選択イベントごとに application（拠点単位・open）を用意し participant を作成
 *
 * 金額は申込フォームの回答が未入力のため 0 で作成し、本人/代表者が後から入力・確定する。
 * 代表者の所属拠点（profiles.branch_id）を申込先拠点として使う。
 */
export async function registerProxyMember(
  input: ProxyMemberInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!input.name.trim()) return { ok: false, error: "氏名を入力してください。" };
  if (!input.email.trim()) return { ok: false, error: "メールアドレスを入力してください。" };
  if (!input.division) return { ok: false, error: "部を選択してください。" };
  if (input.eventIds.length === 0)
    return { ok: false, error: "参加イベントを1つ以上選択してください。" };

  // 代行登録は service_role でアカウント作成・申込を行うため、呼び出し元の権限を必ず検証する。
  const auth = await requireRole(["admin", "representative"]);
  if (!auth.ok) return { ok: false, error: auth.error };

  const branchId = input.branchId;
  if (!branchId) return { ok: false, error: "登録先拠点を選択してください。" };

  const supabase = await createClient();
  if (auth.role === "admin") {
    // 管理者：実在する拠点なら任意に登録できる。
    const { data: b } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .maybeSingle();
    if (!b) return { ok: false, error: "選択した拠点が不正です。" };
  } else {
    // 代表者：自分が代表を務める拠点（branches.representative_user_id）にのみ登録できる。
    // 個人の所属(profiles.branch_id)ではなく担当拠点で判定する。
    const { data: ownBranch } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("representative_user_id", auth.userId)
      .maybeSingle();
    if (!ownBranch)
      return { ok: false, error: "代行登録は、管理者または自拠点の代表者のみ実行できます。" };
  }

  const admin = createAdminClient();

  // 1) アカウント作成（profiles は handle_new_user トリガが metadata から作成）
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: tempPassword(),
    email_confirm: true,
    user_metadata: {
      name: input.name.trim(),
      kana: "",
      branch_id: branchId,
      division: input.division,
      department: input.department?.trim() || "",
    },
  });
  if (cErr) {
    if (cErr.message.toLowerCase().includes("already"))
      return { ok: false, error: "このメールアドレスは既に登録されています。" };
    return { ok: false, error: cErr.message };
  }
  const newUserId = created.user?.id;
  if (!newUserId) return { ok: false, error: "アカウント作成に失敗しました。" };

  // created_via を proxy に
  await admin.from("profiles").update({ created_via: "proxy" } as never).eq("id", newUserId);

  // 2) イベントごとに application（拠点単位）→ participant
  for (const eventId of input.eventIds) {
    const { data: appRow } = await admin
      .from("applications")
      .select("id")
      .eq("event_id", eventId)
      .eq("branch_id", branchId)
      .maybeSingle();
    let applicationId = (appRow as { id: string } | null)?.id;
    if (!applicationId) {
      const { data: newApp, error: appErr } = await admin
        .from("applications")
        .insert({ event_id: eventId, branch_id: branchId, status: "open" } as never)
        .select("id")
        .single();
      if (appErr) return { ok: false, error: appErr.message };
      applicationId = (newApp as { id: string }).id;
    }

    const { error: pErr } = await admin.from("participants").insert({
      application_id: applicationId,
      user_id: newUserId,
      status: "applying",
      total_amount: 0,
      entered_via: "proxy",
      entered_by_user_id: auth.userId,
    } as never);
    if (pErr) return { ok: false, error: pErr.message };
  }

  return { ok: true };
}
