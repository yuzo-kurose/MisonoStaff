import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * ロールに基づくサーバー側の認可ガード。
 *
 * なぜ必要か：
 *   service_role（admin client）を使うサーバーアクションは RLS を迂回するため、
 *   DB 側のポリシーでは守られない。呼び出し元が本当にその操作をしてよいかを
 *   アクション自身で検証しないと、ログインさえしていれば誰でも特権操作を叩けてしまう。
 *
 * role の出所：
 *   auth.users.app_metadata.role（profiles.role からトリガで同期）。
 *   app_metadata はサーバー（service_role）でしか書き換えられないため、
 *   ユーザーがブラウザから改ざんできない＝認可の根拠として信頼できる。
 *   ※ role を変更した直後はトークン再発行（再ログイン/refresh）まで反映されない点に注意。
 */
export type AppRole = "participant" | "representative" | "admin" | "reception";

export async function getAuthContext(): Promise<{ userId: string | null; role: AppRole }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: "participant" };
  const role = (user.app_metadata?.role as AppRole | undefined) ?? "participant";
  return { userId: user.id, role };
}

/** allowed のいずれかのロールを持つことを要求する。満たさなければ error を返す。 */
export async function requireRole(
  allowed: AppRole[],
): Promise<{ ok: true; userId: string; role: AppRole } | { ok: false; error: string }> {
  const { userId, role } = await getAuthContext();
  if (!userId) return { ok: false, error: "ログインが必要です。" };
  if (!allowed.includes(role)) return { ok: false, error: "この操作を行う権限がありません。" };
  return { ok: true, userId, role };
}
