import type { ReactNode } from "react";

/**
 * フォーム下部に固定するアクションバー。
 * 長い入力フォームでも主アクション（保存・作成など）を常に手元に置き、
 * スクロールせずに確定できるようにする業務システム向けのパターン。
 *
 * - PC：本文下端に sticky 固定
 * - スマホ：下部タブバー（fixed）と重ならないよう通常フローで末尾に配置
 *   （AppShell 本文の pb-24 が被りを防ぐ）
 * - left に補助情報（未保存表示・選択件数など）を置ける
 */
export function StickyActionBar({
  children,
  left,
}: {
  children: ReactNode;
  left?: ReactNode;
}) {
  return (
    <div className="-mx-4 mt-8 flex flex-wrap items-center gap-3 border-t border-neutral-200 bg-neutral-white/95 px-4 py-3 backdrop-blur md:sticky md:bottom-0 md:-mx-8 md:px-8">
      {left && <div className="text-body-sm text-neutral-600">{left}</div>}
      <div className="ml-auto flex gap-3">{children}</div>
    </div>
  );
}
