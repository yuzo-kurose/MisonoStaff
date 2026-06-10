import type { ParticipantStatus, AttendanceStatus } from "@/lib/mock/data";
import { statusLabel, attendanceLabel } from "@/lib/mock/data";

const tone: Record<string, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  info: "bg-info-100 text-info-900",
  success: "bg-success-100 text-success-900",
  warning: "bg-warning-100 text-warning-900",
  error: "bg-error-100 text-error-900",
};

export function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: keyof typeof tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-label-sm ${tone[variant]}`}
    >
      {children}
    </span>
  );
}

const partTone: Record<ParticipantStatus, keyof typeof tone> = {
  applying: "neutral",
  confirmed: "info",
  paid: "success",
  cancelled: "error",
};

export function StatusBadge({ status }: { status: ParticipantStatus }) {
  return <Badge variant={partTone[status]}>{statusLabel[status]}</Badge>;
}

const attTone: Record<AttendanceStatus, keyof typeof tone> = {
  not_arrived: "warning",
  checked_in: "success",
  day_cancelled: "error",
};

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return <Badge variant={attTone[status]}>{attendanceLabel[status]}</Badge>;
}
