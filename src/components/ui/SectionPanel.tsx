import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * 色味付きセクションカード。
 * カード上部のカラーアクセント＋アイコンチップ＋同色の区切り線（見出し下）を
 * セクションごとの色で統一して表示する。マイページで採用した配色パターンの共通化。
 */
export type SectionColor = "primary" | "info" | "accent" | "success" | "warning";

const colorMap: Record<SectionColor, { top: string; chip: string; divider: string }> = {
  primary: { top: "border-t-primary-700", chip: "bg-primary-50 text-primary-700", divider: "border-primary-700" },
  info: { top: "border-t-info-900", chip: "bg-info-100 text-info-900", divider: "border-info-900" },
  accent: { top: "border-t-accent-700", chip: "bg-accent-50 text-accent-700", divider: "border-accent-700" },
  success: { top: "border-t-success-900", chip: "bg-success-100 text-success-900", divider: "border-success-900" },
  warning: { top: "border-t-warning-900", chip: "bg-warning-100 text-warning-900", divider: "border-warning-900" },
};

export function SectionPanel({
  color = "primary",
  icon: Icon,
  title,
  action,
  className = "",
  bodyClassName = "",
  children,
}: {
  color?: SectionColor;
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const c = colorMap[color];
  return (
    <div
      className={`rounded-2xl border border-neutral-200 border-t-[3px] ${c.top} bg-neutral-white p-5 shadow-sm ${className}`}
    >
      <div className={`mb-4 flex items-center justify-between gap-3 border-b ${c.divider} pb-3`}>
        <h2 className="flex min-w-0 items-center gap-2 text-heading-sm text-neutral-900">
          <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${c.chip}`}>
            <Icon size={17} />
          </span>
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
