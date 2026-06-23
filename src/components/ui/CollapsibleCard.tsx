"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * 見出しをタップで開閉できるカード。Card と同じ見た目で、折りたたみに対応する。
 * 既定は開いた状態（defaultOpen=true）。アクションボタンは本文側に置くこと。
 */
export function CollapsibleCard({
  title,
  defaultOpen = true,
  children,
  className = "",
}: {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border border-neutral-200 bg-neutral-white shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 px-6 pt-6 text-left ${
          open ? "pb-4" : "pb-6"
        }`}
      >
        <span className="text-heading-lg text-neutral-900">{title}</span>
        <ChevronDown
          size={20}
          className={`flex-none text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}
