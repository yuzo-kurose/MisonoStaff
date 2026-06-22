"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface AuthUserState {
  /** 表示名（user_metadata.name → email の順でフォールバック）。未ログイン時は空文字。 */
  who: string;
  /** ログイン済みかどうか。 */
  authed: boolean;
  /** 権限ロール（app_metadata.role）。未ログイン/未判定は undefined。 */
  role?: string;
  /** 初回判定が完了したか（true になるまでは描画を保留できる）。 */
  ready: boolean;
}

/**
 * クライアントコンポーネントでログイン状態を取得する共通フック。
 * 初回に getUser() で判定し、その後の login/logout も onAuthStateChange で追従する。
 */
export function useAuthUser(): AuthUserState {
  const [state, setState] = useState<AuthUserState>({ who: "", authed: false, ready: false });

  useEffect(() => {
    const supabase = createClient();

    const apply = (user: User | null) => {
      const name = (user?.user_metadata?.name as string | undefined) || user?.email || "";
      const role = user?.app_metadata?.role as string | undefined;
      setState({ who: name, authed: !!user, role, ready: true });
    };

    supabase.auth.getUser().then(({ data }) => apply(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null));

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
