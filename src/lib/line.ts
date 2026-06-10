import "server-only";

/**
 * LINE ログイン（OIDC）のサーバー側ヘルパー。
 * Supabase に LINE プロバイダは無いため、カスタム OAuth で実装する：
 *   /auth/line/login  → LINE authorize へ
 *   /auth/line/callback → code 交換 → ユーザー find-or-create → magiclink 発行
 *   /auth/confirm     → verifyOtp でセッション確立
 *
 * 必要な環境変数:
 *   LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET
 *   NEXT_PUBLIC_APP_URL（コールバックURLの組み立てに使用）
 * LINE Developers コンソールで Callback URL に `<APP_URL>/auth/line/callback` を登録すること。
 */
export function lineConfig() {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    channelId,
    channelSecret,
    redirectUri: `${appUrl}/auth/line/callback`,
    configured: Boolean(channelId && channelSecret),
  };
}

export function lineAuthorizeUrl(state: string): string {
  const { channelId, redirectUri } = lineConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId ?? "",
    redirect_uri: redirectUri,
    state,
    scope: "openid profile email",
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

export async function lineExchangeToken(code: string): Promise<{ id_token: string }> {
  const { channelId, channelSecret, redirectUri } = lineConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: channelId ?? "",
    client_secret: channelSecret ?? "",
  });
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`LINE token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { id_token: string };
}

/** id_token（LINE のトークン交換で取得・TLS経由のため信頼）から識別情報を取り出す。 */
export function decodeLineIdToken(idToken: string): {
  sub: string;
  name?: string;
  email?: string;
} {
  const payload = JSON.parse(
    Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"),
  ) as { sub: string; name?: string; email?: string };
  return { sub: payload.sub, name: payload.name, email: payload.email };
}
