// 任意のSQLファイルを接続先DBで実行する簡易ツール
//   使い方: DB_URL='postgresql://...' node scripts/run-sql.mjs supabase/seed.sql
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
const dbUrl = process.env.DB_URL;
if (!file || !dbUrl) {
  console.error("usage: DB_URL=... node scripts/run-sql.mjs <file.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client({ connectionString: dbUrl });

try {
  await client.connect();
  await client.query(sql);
  console.log(`OK: applied ${file}`);
} catch (e) {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
