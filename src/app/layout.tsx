import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import { RouteProgress } from "@/components/layout/RouteProgress";

// Zen丸ゴシック（やわらかい丸ゴシック）
const zenMaruGothic = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-zen-maru-gothic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "神苑スタッフ 参加申込システム",
  description: "神苑スタッフの参加申込・事前決済・受付管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={zenMaruGothic.variable}>
      <body className="font-sans text-body-md antialiased">
        <RouteProgress />
        {children}
      </body>
    </html>
  );
}
