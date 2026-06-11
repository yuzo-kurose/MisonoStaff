// 既存ユーザーのパスワードだけを service_role で直接設定するスクリプト。
//   - profiles（name/kana/role）には一切触れない（ensure-admin.mjs との違い）。
//   - email_confirm:true も付けるので、未確認ユーザーでもそのままログイン可能になる。
//   - パスワード省略時は強いランダムパスワードを生成して表示する（初期パスワード発行用途）。
//
// .env.local から NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を自動読込する。
//
// 使い方:
//   node scripts/set-password.mjs <email> [password]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

// .env.local を素朴にパースして process.env に流し込む（依存追加なし）
function loadEnv(path = ".env.local") {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* ファイルが無ければ既存の process.env を使う */
  }
}
loadEnv();

const email = process.argv[2];
let password = process.argv[3];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE;

if (!email || !url || !key) {
  console.error("usage: node scripts/set-password.mjs <email> [password]");
  console.error("  (.env.local の NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を使用)");
  process.exit(1);
}

// パスワード未指定なら 16 文字の安全なランダムを生成（記号入り）
if (!password) {
  const raw = randomBytes(12).toString("base64").replace(/[/+=]/g, "");
  password = `${raw}!a9`; // 英大小数字記号を確実に含める
  console.log("生成した初期パスワード:", password);
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

const user = await findUser(email);
if (!user) {
  console.error(`ユーザーが見つかりません: ${email}（先に新規登録が必要です）`);
  process.exit(1);
}

const { error } = await admin.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
});
if (error) {
  console.error("updateUser error:", error.message);
  process.exit(1);
}
console.log(`パスワードを設定しました: ${email} (id=${user.id})`);
console.log("このパスワードを本人に安全な手段で伝えてください。");
