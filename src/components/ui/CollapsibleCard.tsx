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
    <div className={`overflow-hidden rounded-xl border border-neutral-200 bg-neutral-white shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-neutral-50 ${
          open ? "border-b border-neutral-200" : ""
        }`}
      >
        {/* 見出しアクセント（PageHeader と統一） */}
        <span className="h-5 w-1.5 flex-none rounded-full bg-primary-700" aria-hidden />
        <span className="flex-1 text-body-md font-semibold tracking-tight text-neutral-900">
          {title}
        </span>
        <span
          className="grid h-7 w-7 flex-none place-items-center rounded-full bg-neutral-100 text-neutral-500 transition-colors group-hover:bg-neutral-200"
          aria-hidden
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}
