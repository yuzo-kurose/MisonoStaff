import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "dangerOutline" | "ghost";
type Size = "sm" | "md" | "lg";

// 高さ・余白はサイズ側で持つ（min-h を base に置くと sm が効かないため）。
const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary-900 text-neutral-white hover:bg-primary-800",
  secondary:
    "border border-neutral-500 bg-neutral-white text-neutral-900 hover:bg-neutral-100",
  danger: "bg-error-900 text-neutral-white hover:opacity-90",
  // 一覧の削除・返金など、危険操作だが枠でボタンと分かるようにする。
  dangerOutline:
    "border border-error-900/40 bg-neutral-white text-error-900 hover:bg-error-100",
  ghost: "text-primary-900 hover:bg-primary-50",
};

const sizes: Record<Size, string> = {
  // 一覧の操作列向け：行に馴染む高さ。
  sm: "min-h-9 px-3 py-1.5 text-label-sm",
  md: "min-h-11 px-4 py-2.5 text-label-md",
  lg: "min-h-12 px-6 py-3 text-label-lg",
};

function classes(variant: Variant, size: Size, full?: boolean, extra?: string) {
  return [base, variants[variant], sizes[size], full ? "w-full" : "", extra ?? ""]
    .filter(Boolean)
    .join(" ");
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button className={classes(variant, size, fullWidth, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  href,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={classes(variant, size, fullWidth)}>
      {children}
    </Link>
  );
}
