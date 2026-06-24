"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guard";
import { sendEmail } from "@/lib/email";
import type { FieldType } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

/** メールアドレスから既存ユーザーのIDを探す（なければ null）。 */
async function findUserIdByEmail(admin: AdminClient, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; ; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === target);
    if (u) return u.id;
    if (data.users.length < 200) return null;
  }
}

export type ProxyValue = {
  fieldId: string;
  value: string | null; // text/textarea/number/date
  optionIds: string[]; // select_single/select_multiple
};

export type ProxyMemberInput = {
  eventIds: string[];
  branchId: string; // 登録先拠点（代表者＝担当拠点／管理者＝任意の拠点）
  name: string;
  email: string;
  division: string;
  department?: string; // 配置先（任意）
  values?: ProxyValue[]; // イベントのフォーム回答（任意・該当イベントのフォーム項目のみ書き込む）
};

export type ProxyField = {
  id: string;
  formId: string;
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  priceCalcType: "none" | "per_unit" | "option_based";
  unitPrice: number | null;
  options: { id: string; label: string; price: number | null }[];
};

/**
 * 選択中イベントのフォーム項目を取得（代行入力の一覧表に列として並べるため）。
 * 複数イベントを選んだ場合は各フォームの項目を結合して返す（各項目は所属フォームのイベントにのみ書き込まれる）。
 */
export async function getProxyFields(eventIds: string[]): Promise<ProxyField[]> {
  const auth = await requireRole(["admin", "representative"]);
  if (!auth.ok || eventIds.length === 0) return [];
  const admin = createAdminClient();

  const { data: evs } = await admin.from("events").select("id,form_id").in("id", eventIds);
  const formIds = [
    ...new Set(((evs ?? []) as unknown as { form_id: string }[]).map((e) => e.form_id)),
  ];
  if (formIds.length === 0) return [];

  const { data: fieldsData } = await admin
    .from("form_fields")
    .select("id,form_id,label,field_type,is_required,sort_order,price_calc_type,unit_price")
    .in("form_id", formIds)
    .order("sort_order", { ascending: true });
  const fields = (fieldsData ?? []) as unknown as {
    id: string;
    form_id: string;
    label: string;
    field_type: FieldType;
    is_required: boolean;
    price_calc_type: "none" | "per_unit" | "option_based";
    unit_price: number | null;
  }[];
  if (fields.length === 0) return [];

  const { data: optData } = await admin
    .from("form_field_options")
    .select("id,form_field_id,label,price,sort_order")
    .in("form_field_id", fields.map((f) => f.id))
    .order("sort_order", { ascending: true });
  const opts = (optData ?? []) as unknown as {
    id: string;
    form_field_id: string;
    label: string;
    price: number | null;
  }[];

  return fields.map((f) => ({
    id: f.id,
    formId: f.form_id,
    label: f.label,
    fieldType: f.field_type,
    isRequired: f.is_required,
    priceCalcType: f.price_calc_type,
    unitPrice: f.unit_price,
    options: opts
      .filter((o) => o.form_field_id === f.id)
      .map((o) => ({ id: o.id, label: o.label, price: o.price })),
  }));
}

/** 仮パスワード（本人が初回ログインで再設定する想定）。 */
function tempPassword(): string {
  return `${crypto.randomUUID()}Aa1!`;
}

/**
 * 代表者がメンバー1名分の申込を代行登録する。
 *  - メールから既存ユーザーを特定（アカウント登録済みでも可）。未登録なら確認済みアカウントを作成。
 *  - 選択イベントごとに application（拠点単位・open）を用意し participant を作成
 *  - 登録後、本人へ申込結果メールを送信する（ベストエフォート）。
 *
 * 金額はフォーム回答から再計算する。登録先拠点（input.branchId）を申込先拠点として使う。
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
  const email = input.email.trim();

  // 1) ユーザーを特定：既存（アカウント登録済み）なら再利用。無ければ確認済みアカウントを作成する。
  //    ※ アカウント発行の有無に関わらず、登録後に申込結果メールを送る。
  let userId = await findUserIdByEmail(admin, email);
  if (!userId) {
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
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
      // 競合（同時作成等）で既に存在する場合は再検索して再利用。
      userId = await findUserIdByEmail(admin, email);
      if (!userId) return { ok: false, error: cErr.message };
    } else {
      userId = created.user?.id ?? null;
      if (userId) await admin.from("profiles").update({ created_via: "proxy" } as never).eq("id", userId);
    }
  }
  if (!userId) return { ok: false, error: "ユーザーの特定に失敗しました。" };

  // フォーム回答を保存・金額計算するため、対象イベントの form_id と項目定義を取得する。
  const values = input.values ?? [];
  const { data: evRows } = await admin
    .from("events")
    .select("id,form_id,name")
    .in("id", input.eventIds);
  const eventForms = (evRows ?? []) as unknown as { id: string; form_id: string; name: string }[];

  const fieldIds = values.map((v) => v.fieldId);
  let fieldDefs: { id: string; form_id: string; price_calc_type: string; unit_price: number | null }[] = [];
  let optDefs: { id: string; price: number | null }[] = [];
  if (fieldIds.length) {
    const { data: fd } = await admin
      .from("form_fields")
      .select("id,form_id,price_calc_type,unit_price")
      .in("id", fieldIds);
    fieldDefs = (fd ?? []) as unknown as typeof fieldDefs;
    const optionIds = values.flatMap((v) => v.optionIds);
    if (optionIds.length) {
      const { data: od } = await admin
        .from("form_field_options")
        .select("id,price")
        .in("id", optionIds);
      optDefs = (od ?? []) as unknown as typeof optDefs;
    }
  }

  // 回答を participant_values / participant_value_options に書き込む。
  const writeValues = async (participantId: string, vs: ProxyValue[]) => {
    for (const v of vs) {
      const { data: pvNew, error: pvErr } = await admin
        .from("participant_values")
        .insert({ participant_id: participantId, form_field_id: v.fieldId, value: v.value } as never)
        .select("id")
        .single();
      if (pvErr) throw new Error(pvErr.message);
      if (v.optionIds.length) {
        const pvId = (pvNew as { id: string }).id;
        const { error: pvoErr } = await admin.from("participant_value_options").insert(
          v.optionIds.map((oid) => ({
            participant_value_id: pvId,
            form_field_option_id: oid,
          })) as never,
        );
        if (pvoErr) throw new Error(pvoErr.message);
      }
    }
  };

  // 2) イベントごとに application（拠点単位）→ participant（回答・金額つき）
  for (const eventId of input.eventIds) {
    const formId = eventForms.find((e) => e.id === eventId)?.form_id;
    // このイベントのフォームに属する回答だけを対象にする。
    const evValues = values.filter(
      (v) => fieldDefs.find((f) => f.id === v.fieldId)?.form_id === formId && (v.value || v.optionIds.length),
    );

    // 金額計算（クライアント値ではなく DB 定義から再計算）
    let total = 0;
    for (const v of evValues) {
      const f = fieldDefs.find((x) => x.id === v.fieldId);
      if (!f) continue;
      if (f.price_calc_type === "per_unit") {
        total += (Number(v.value) || 0) * (f.unit_price ?? 0);
      } else if (f.price_calc_type === "option_based") {
        for (const oid of v.optionIds) total += optDefs.find((o) => o.id === oid)?.price ?? 0;
      }
    }

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

    const { data: partNew, error: pErr } = await admin
      .from("participants")
      .insert({
        application_id: applicationId,
        user_id: userId,
        status: "applying",
        total_amount: total,
        entered_via: "proxy",
        entered_by_user_id: auth.userId,
      } as never)
      .select("id")
      .single();
    if (pErr) return { ok: false, error: pErr.message };

    try {
      if (evValues.length) await writeValues((partNew as { id: string }).id, evValues);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "回答の保存に失敗しました。" };
    }
  }

  // 3) 申込結果をメールで本人に通知（ベストエフォート）。
  const eventNames = input.eventIds
    .map((id) => eventForms.find((e) => e.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const html = `
    <p>${input.name.trim()} 様</p>
    <p>下記イベントの参加申込を代行で登録しました。内容をご確認ください。</p>
    <ul>${eventNames.map((n) => `<li>${n}</li>`).join("")}</ul>
    <p>マイページからご確認・変更いただけます：<a href="${appUrl}/mypage">マイページを開く</a></p>`;
  try {
    await sendEmail({
      to: email,
      subject: "【神苑スタッフ】参加申込（代行登録）のお知らせ",
      html,
    });
  } catch {
    // メール送信失敗は申込自体の成否に影響させない。
  }

  return { ok: true };
}
