"use client";

import { useEffect, type ReactNode } from "react";
import { useHeaderMeta } from "@/components/layout/header-meta";

/**
 * ページ見出し。タイトルと補足説明は上部ヘッダーに表示するため、
 * - `title` は互換のため受け取るが描画しない（ヘッダーがルートから導出）。
 * - `description` はヘッダーへ登録する（氏名・イベント名など動的な値に対応）。
 * 本文側にはアクション（ボタン等）のみを右寄せで表示する。
 */
export function PageHeader({
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const meta = useHeaderMeta();
  useEffect(() => {
    meta?.setDescription(description ?? null);
    return () => meta?.setDescription(null);
  }, [description, meta]);

  if (!action) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-end gap-3">{action}</div>
  );
}
