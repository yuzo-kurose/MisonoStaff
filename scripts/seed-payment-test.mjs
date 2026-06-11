// 決済E2Eテスト用の「確定済み・未払い」参加者を作る冪等スクリプト。
//   1) テストユーザーを作成 or パスワード再設定（メール確認済み）
//   2) profiles に所属(branch)・部(division)・氏名を upsert
//   3) application を find-or-create（status=confirmed）
//   4) participant を find-or-create（status=confirmed, total_amount>0, entered_via=self）
// これで /payment の createCheckout が拾える状態になる。
//   使い方:
//   SUPABASE_URL=.. SERVICE_ROLE=.. node scripts/seed-payment-test.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE;
if (!url || !key) {
  console.error("usage: SUPABASE_URL=.. SERVICE_ROLE=.. node scripts/seed-payment-test.mjs");
  process.exit(1);
}

// --- テストデータの設定（必要なら変更可）---
const EMAIL = "pay.test@example.com";
const PASSWORD = "PayTest2026!";
const NAME = "決済テスト 花子";
const KANA = "けっさいてすと はなこ";
const DIVISION = "general"; // student/university/adult/mens/general
const BRANCH_ID = "11111111-1111-1111-1111-111111111111"; // 東京支部
const EVENT_ID = "ccccccc1-0000-0000-0000-000000000001"; // 元旦祭 奉仕
const AMOUNT = 3000; // 円

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUser(target) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
}

// 1) ユーザー
let user = await findUser(EMAIL);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME, kana: KANA, branch_id: BRANCH_ID, division: DIVISION },
  });
  if (error) { console.error("createUser:", error.message); process.exit(1); }
  user = data.user;
  console.log("created user:", user.id);
} else {
  await admin.auth.admin.updateUserById(user.id, { password: PASSWORD, email_confirm: true });
  console.log("existing user (password reset):", user.id);
}

// 2) profiles（所属・部を確実に設定）
{
  const { error } = await admin
    .from("profiles")
    .upsert({ id: user.id, name: NAME, kana: KANA, branch_id: BRANCH_ID, division: DIVISION, role: "participant" }, { onConflict: "id" });
  if (error) { console.error("profiles upsert:", error.message); process.exit(1); }
}

// 3) application（event×branch は unique → find-or-create）
let applicationId;
{
  const { data: existing } = await admin
    .from("applications")
    .select("id")
    .eq("event_id", EVENT_ID)
    .eq("branch_id", BRANCH_ID)
    .maybeSingle();
  if (existing) {
    applicationId = existing.id;
    await admin.from("applications").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", applicationId);
    console.log("application reused:", applicationId);
  } else {
    const { data, error } = await admin
      .from("applications")
      .insert({ event_id: EVENT_ID, branch_id: BRANCH_ID, status: "confirmed", confirmed_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) { console.error("application insert:", error.message); process.exit(1); }
    applicationId = data.id;
    console.log("application created:", applicationId);
  }
}

// 4) participant（application×user は unique → find-or-create、必ず confirmed/未払いに戻す）
{
  const { data: existing } = await admin
    .from("participants")
    .select("id")
    .eq("application_id", applicationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    await admin
      .from("participants")
      .update({ status: "confirmed", total_amount: AMOUNT, cancelled_at: null, cancel_reason: null })
      .eq("id", existing.id);
    // 過去の未完了 payments を掃除
    await admin.from("payments").delete().eq("participant_id", existing.id).neq("status", "completed");
    console.log("participant reset to confirmed:", existing.id);
  } else {
    const { data, error } = await admin
      .from("participants")
      .insert({ application_id: applicationId, user_id: user.id, status: "confirmed", total_amount: AMOUNT, entered_via: "self" })
      .select("id")
      .single();
    if (error) { console.error("participant insert:", error.message); process.exit(1); }
    console.log("participant created:", data.id);
  }
}

console.log("\n=== 決済テスト準備OK ===");
console.log("ログイン:", EMAIL, "/", PASSWORD);
console.log("金額:", AMOUNT, "円（元旦祭 奉仕 / 東京支部）");
console.log("手順: ログイン → /payment → 決済する → テストカード 4242 4242 4242 4242 で支払い");
