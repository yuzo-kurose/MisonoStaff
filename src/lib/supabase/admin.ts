import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * service_role クライアント（RLS をバイパス）。
 * Stripe Webhook・決済/返金・通知/監査ログの書き込みなど、サーバー側処理専用。
 * 絶対にクライアント（ブラウザ）へ import しないこと。SUPABASE_SERVICE_ROLE_KEY は秘匿。
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
