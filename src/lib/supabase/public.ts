import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 公開データ（公開イベント・公開連絡事項）の読み取り専用クライアント。
 *
 * クッキー（セッション）を読まないため、Next.js のデータキャッシュ（unstable_cache）の
 * 内側でも利用できる（cookies/headers を使う関数はキャッシュ不可のため）。
 * 取得できるのは RLS で全員に許可された公開行のみ＝ユーザーによらず同一結果なので、
 * キャッシュして共有しても安全。
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
