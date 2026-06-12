import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/types/database";

/**
 * サーバー（Server Component / Route Handler）用 Supabase クライアント。anon キー + ユーザーセッション。
 *
 * React `cache()` で同一リクエスト内では同じインスタンスを再利用する（毎回 cookies() を読み直さない）。
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合は set 不可（middleware 側で更新する）
          }
        },
      },
    },
  );
});

/**
 * ログイン中ユーザーを取得する（同一リクエスト内では1回だけ実ネットワーク往復する）。
 *
 * `auth.getUser()` は毎回 Supabase 認証サーバーへ往復する重い処理。1ページ表示で
 * ページ本体・各クエリ・ガードが個別に呼ぶと往復が積み上がり遷移が遅くなる。
 * React `cache()` で同一リクエスト内の呼び出しを1回に集約する（結果はリクエスト終了で破棄）。
 * セキュリティ特性は getUser と同じ（毎リクエスト検証する）。
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
