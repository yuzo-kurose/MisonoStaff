import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/** 認証が必要なパスのプレフィックス */
const PROTECTED = ["/mypage", "/events", "/payment", "/rep", "/admin", "/reception"];

/**
 * ロール制限が必要なパス（多層防御）。
 * データ自体は RLS とアクション内の requireRole で守られているが、
 * 非権限ユーザーをそもそも入口で弾いておくと事故が起きにくい。
 * role は JWT(app_metadata) 由来＝改ざん不可。
 * 注意: /rep は「拠点代表者」が branches.representative_user_id で決まり role 列が
 *   representative とは限らないため、ここでは role で弾かず（誤ブロック回避）、
 *   RLS とアクションのガードに委ねる。
 */
const ROLE_GATES: { prefix: string; allow: string[] }[] = [
  { prefix: "/admin", allow: ["admin"] },
  { prefix: "/reception", allow: ["reception", "admin"] },
];

/**
 * セッショントークンを更新し、未ログインで保護ページにアクセスした場合は /login へ。
 * root の middleware.ts から呼ぶ。
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 入口ゲート（早期リダイレクト）用の軽量チェック。
  // getUser() は毎回 Supabase 認証サーバーへ往復するため全ナビゲーションが重くなる。
  // ここはあくまで「未ログインを入口で弾く／権限のない区画を案内する」ためのUX用ゲートで、
  // 実データは RLS、特権操作は各アクションの requireRole（= getUser で厳密検証）で守られている。
  // そのため getSession()（クッキーのJWTをローカル検証、期限切れ時のみトークン更新の往復）で
  // 十分高速に判定する。トークン更新は getSession でも行われ、上の setAll でクッキーへ反映される。
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // ロール制限：権限のないユーザーが管理/受付画面に入ろうとしたらマイページへ戻す。
  if (user) {
    const role = (user.app_metadata?.role as string | undefined) ?? "participant";
    const gate = ROLE_GATES.find(
      (g) => path === g.prefix || path.startsWith(g.prefix + "/"),
    );
    if (gate && !gate.allow.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/mypage";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
