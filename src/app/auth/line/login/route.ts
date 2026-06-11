import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { lineConfig, lineAuthorizeUrl } from "@/lib/line";

/** LINE authorize へリダイレクト。CSRF対策の state を cookie に保存。 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!lineConfig().configured) {
    return NextResponse.redirect(new URL("/login?error=line_unconfigured", origin));
  }

  const state = randomUUID();
  const res = NextResponse.redirect(lineAuthorizeUrl(state));
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("line_oauth_state", state, cookieOpts);

  // 新規登録から来た場合、入力済みプロフィール（所属・部・氏名・読み仮名）を引き継ぐ
  const p = request.nextUrl.searchParams;
  const profile = {
    branch_id: p.get("branch_id") ?? "",
    division: p.get("division") ?? "",
    department: p.get("department") ?? "",
    name: p.get("name") ?? "",
    kana: p.get("kana") ?? "",
  };
  if (profile.branch_id || profile.name) {
    res.cookies.set("line_signup_profile", encodeURIComponent(JSON.stringify(profile)), cookieOpts);
  }
  return res;
}
