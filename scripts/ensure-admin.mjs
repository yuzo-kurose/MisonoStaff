// 管理者アカウントを「作成 or 既存更新」する冪等スクリプト。
//   - 未登録: ユーザー作成（メール確認済み）
//   - 登録済み: パスワード再設定
//   いずれも profiles を upsert して role=admin に昇格（トリガ未発火の既存ユーザーにも対応）
//   使い方:
//   SUPABASE_URL=... SERVICE_ROLE=... node scripts/ensure-admin.mjs <email> <password> [name]
import { createClient } from "@supabase/supabase-js";

const [email, password, name = "管理者"] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE;
if (!email || !password || !url || !key) {
  console.error("usage: SUPABASE_URL=.. SERVICE_ROLE=.. node scripts/ensure-admin.mjs <email> <password> [name]");
  process.exit(1);
}

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

let user = await findUser(email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, kana: "かんりしゃ" },
  });
  if (error) {
    console.error("createUser error:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log("created auth user:", user.id);
} else {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) {
    console.error("updateUser error:", error.message);
    process.exit(1);
  }
  console.log("existing user updated (password reset):", user.id);
}

const { error: upErr } = await admin
  .from("profiles")
  .upsert({ id: user.id, name, kana: "かんりしゃ", role: "admin" }, { onConflict: "id" });
if (upErr) {
  console.error("profiles upsert error:", upErr.message);
  process.exit(1);
}
console.log("promoted to admin:", email);
