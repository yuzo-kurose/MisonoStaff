import type { LucideIcon } from "lucide-react";

const tone = {
  primary: "bg-primary-50 text-primary-900",
  success: "bg-success-100 text-success-900",
  warning: "bg-warning-100 text-warning-900",
  info: "bg-info-100 text-info-900",
  neutral: "bg-neutral-100 text-neutral-700",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  variant = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  variant?: keyof typeof tone;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 flex-none place-items-center rounded-lg ${tone[variant]}`}>
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-label-sm text-neutral-600">{label}</p>
          <p className="text-heading-lg leading-tight text-neutral-900">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-body-sm text-neutral-600">{sub}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}
