import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

// マイページ配下（/mypage, /mypage/history, /mypage/profile）で共通シェルを常駐させる。
// 画面遷移時にサイドバー等が再マウントされず、コンテンツだけ差し替わるため体感が速くなる。
export default function MyPageLayout({ children }: { children: ReactNode }) {
  return <AppShell role="participant">{children}</AppShell>;
}
