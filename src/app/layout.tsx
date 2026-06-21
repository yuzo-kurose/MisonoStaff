import type { Metadata } from "next";
import "./globals.css";
import { RouteProgress } from "@/components/layout/RouteProgress";

// フォントは游ゴシック体（システムフォント）。tailwind の font-sans でスタック指定。

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
    <html lang="ja">
      <body className="font-sans text-body-md antialiased">
        <RouteProgress />
        {children}
      </body>
    </html>
  );
}
