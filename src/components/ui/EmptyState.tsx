import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 空状態の共通表示。「何も無い」を白紙で見せず、理由と次の行動を示すための部品。
 * UXガイドライン: 空状態は説明＋アクションを置く（白紙のまま放置しない）。
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-white px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-neutral-100 text-neutral-400">
        <Icon size={26} />
      </span>
      <p className="text-heading-sm text-neutral-900">{title}</p>
      {description && <p className="max-w-sm text-body-sm text-neutral-600">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
