import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function SegmentLayout({ children }: { children: ReactNode }) {
  return <AppShell role="admin">{children}</AppShell>;
}
