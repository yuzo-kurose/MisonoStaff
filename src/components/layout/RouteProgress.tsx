"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * 画面遷移中に上部へ表示する進捗バー。
 * リンククリックで開始し、パス変更（遷移完了）で消える。
 * 現在ページが見えたまま動くので「固まったように見える」体感を軽減する。
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  // 遷移完了（パスが変わった）でバーを消す
  useEffect(() => {
    setActive(false);
  }, [pathname]);

  // 内部リンクのクリックで開始
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank") return;
      try {
        const url = new URL(a.href);
        if (url.origin === location.origin && url.pathname !== location.pathname) {
          setActive(true);
        }
      } catch {
        /* noop */
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!active) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-primary-100">
      <div className="route-progress-bar h-full w-1/3 bg-primary-700" />
    </div>
  );
}
