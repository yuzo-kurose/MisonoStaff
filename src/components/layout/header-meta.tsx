"use client";

import { createContext, useContext } from "react";

/**
 * ページ→上部ヘッダーへ「補足説明」を受け渡すための仕組み。
 * タイトルはルートから導出するが、説明文は氏名・イベント名など動的なため、
 * 各ページの PageHeader から Context 経由でヘッダーに登録する。
 */
type HeaderMeta = { setDescription: (d: string | null) => void };

export const HeaderMetaContext = createContext<HeaderMeta | null>(null);

export function useHeaderMeta(): HeaderMeta | null {
  return useContext(HeaderMetaContext);
}
