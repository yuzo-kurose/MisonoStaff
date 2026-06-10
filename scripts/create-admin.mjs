// 管理者アカウントを作成（メール確認済み）→ profiles.role を admin に昇格
//   使い方:
//   SUPABASE_URL=... SERVICE_ROLE=... node scripts/create-admin.mjs <email> <password> [name]
import { createClient } from "@supabase/supabase-js";

const [email, password, name = "管理者"] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE;
if (!email || !password || !url || !key) {
  console.error("usage: SUPABASE_URL=.. SERVICE_ROLE=.. node scripts/create-admin.mjs <email> <password> [name]");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// 1) ユーザー作成（メール確認済み）
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name, kana: "かんりしゃ" },
});
if (createErr) {
  console.error("createUser error:", createErr.message);
  process.exit(1);
}
const userId = created.user.id;
console.log("created auth user:", userId);

// 2) profiles を admin に昇格（トリガで profiles 行は作成済み）
const { error: updErr } = await admin
  .from("profiles")
  .update({ role: "admin", name })
  .eq("id", userId);
if (updErr) {
  console.error("profiles update error:", updErr.message);
  process.exit(1);
}
console.log("promoted to admin:", email);
