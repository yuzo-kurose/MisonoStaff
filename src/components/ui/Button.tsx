import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-label-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary-900 text-neutral-white hover:bg-primary-800",
  secondary:
    "border border-neutral-500 bg-neutral-white text-neutral-900 hover:bg-neutral-100",
  danger: "bg-error-900 text-neutral-white hover:opacity-90",
  ghost: "text-primary-900 hover:bg-primary-50",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2.5",
  lg: "px-6 py-3 text-label-lg",
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
