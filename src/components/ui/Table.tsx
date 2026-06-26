import type { ReactNode } from "react";

/**
 * 共通テーブル。
 * - scroll=true（既定）：列が多いと横スクロール（overflow-x-auto）。
 * - scroll=false：横スクロールさせず、コンテナ幅に収める（セルは折り返す）。
 */
export function Table({
  head,
  children,
  scroll = true,
}: {
  head: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-neutral-white shadow-sm ${
        scroll ? "overflow-x-auto" : ""
      }`}
    >
      <table className="w-full border-collapse text-body-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-label-md text-neutral-700">
          {head}
        </thead>
        <tbody className="divide-y divide-neutral-200 [&>tr:hover]:bg-neutral-50">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  // className 指定時は折り返し可（既定は nowrap）。
  return (
    <th className={`px-3 py-3 font-medium ${className || "whitespace-nowrap"}`}>{children}</th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-top text-neutral-900 ${className}`}>{children}</td>;
}
