import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-neutral-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-heading-lg text-neutral-900">{children}</h2>;
}

/**
 * 番号付きの見出しを持つセクションカード。
 * 入力フォームを手順として見せ、全体のどこを編集中か把握しやすくする。
 */
export function SectionCard({
  step,
  title,
  description,
  children,
  className = "",
}: {
  step?: number;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start gap-3">
        {step != null && (
          <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-primary-50 text-label-sm font-medium text-primary-900">
            {step}
          </span>
        )}
        <div>
          <h2 className="text-heading-md text-neutral-900">{title}</h2>
          {description && <p className="mt-0.5 text-body-sm text-neutral-600">{description}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-heading-xl text-neutral-900">{title}</h1>
        {description && (
          <p className="mt-1 text-body-sm text-neutral-700">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
