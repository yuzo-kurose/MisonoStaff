import type { ReactNode } from "react";

const tone = {
  info: "bg-info-100 text-info-900",
  success: "bg-success-100 text-success-900",
  warning: "bg-warning-100 text-warning-900",
  error: "bg-error-100 text-error-900",
};

export function Alert({
  variant = "info",
  children,
}: {
  variant?: keyof typeof tone;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-lg px-4 py-3 text-body-sm ${tone[variant]}`}>
      {children}
    </div>
  );
}
