import type { ReactNode } from "react";

const tone = {
  info: "bg-info-100 text-info-900",
  success: "bg-success-100 text-success-900",
  warning: "bg-warning-100 text-warning-900",
  error: "bg-error-100 text-error-900",
};

/**
 * 通知バナー。
 * アクセシビリティ：エラー/警告は role="alert"（assertive＝即時読み上げ）、
 * 情報/成功は role="status" + aria-live="polite"。視覚だけでなくスクリーンリーダーにも
 * 状態を伝えるため（フォーム送信失敗の通知などに必須・WCAG）。
 */
export function Alert({
  variant = "info",
  children,
}: {
  variant?: keyof typeof tone;
  children: ReactNode;
}) {
  const urgent = variant === "error" || variant === "warning";
  return (
    <div
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      className={`rounded-lg px-4 py-3 text-body-sm ${tone[variant]}`}
    >
      {children}
    </div>
  );
}
