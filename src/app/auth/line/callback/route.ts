import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lineConfig, lineExchangeToken, decodeLineIdToken } from "@/lib/line";

/**
 * LINE からのコールバック。
 *  code → id_token 取得 → profiles.line_user_id で照合（無ければアカウント作成）→
 *  magiclink を発行し /auth/confirm へ。/auth/confirm でセッションを確立する。
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const cookieState = request.cookies.get("line_oauth_state")?.value;

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, origin));

  if (!lineConfig().configured) return fail("line_unconfigured");
  if (!code || !state || !cookieState || state !== cookieState) return fail("line_state");

  try {
    const { id_token } = await lineExchangeToken(code);
    const { sub, name, email } = decodeLineIdToken(id_token);
    const admin = createAdminClient();

    // 新規登録から引き継いだプロフィール（所属・部・氏名・読み仮名）
    let signupProfile: { branch_id?: string; division?: string; name?: string; kana?: string } = {};
    const rawProfile = request.cookies.get("line_signup_profile")?.value;
    if (rawProfile) {
      try {
        signupProfile = JSON.parse(decodeURIComponent(rawProfile));
      } catch {
        /* 壊れていれば無視 */
      }
    }

    // 既に LINE 連携済みのユーザーを探す
    const { data: prof } = await admin
      .from("profiles")
      .select("id")
      .eq("line_user_id", sub)
      .maybeSingle();
    let userId = (prof as { id: string } | null)?.id ?? null;
    // LINE が email を返さない場合は合成アドレス（magiclink は実送信せず直接発行するため到達不要）
    let loginEmail = email ?? `line_${sub}@line.local`;

    if (!userId) {
      // user_metadata に渡すと handle_new_user トリガが profiles を所属・部・氏名で作成する
      const { data: created, error } = await admin.auth.admin.createUser({
        email: loginEmail,
        email_confirm: true,
        user_metadata: {
          name: signupProfile.name || name || "LINEユーザー",
          kana: signupProfile.kana ?? "",
          branch_id: signupProfile.branch_id || null,
          division: signupProfile.division || null,
          line_user_id: sub,
        },
      });
      if (error || !created.user) return fail("line_create");
      userId = created.user.id;
      await admin
        .from("profiles")
        .update({ line_user_id: sub } as never)
        .eq("id", userId);
    } else {
      const { data: u } = await admin.auth.admin.getUserById(userId);
      loginEmail = u.user?.email ?? loginEmail;
    }

    // magiclink を発行（メール送信はせず、token_hash を /auth/confirm に渡してセッション確立）
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: loginEmail,
    });
    if (linkErr || !link.properties?.hashed_token) return fail("line_session");

    const confirm = new URL("/auth/confirm", origin);
    confirm.searchParams.set("token_hash", link.properties.hashed_token);
    confirm.searchParams.set("type", "magiclink");
    confirm.searchParams.set("next", "/mypage");

    const res = NextResponse.redirect(confirm);
    res.cookies.delete("line_oauth_state");
    res.cookies.delete("line_signup_profile");
    return res;
  } catch {
    return fail("line_error");
  }
}
