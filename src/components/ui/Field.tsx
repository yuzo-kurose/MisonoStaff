import type { ComponentProps, ReactNode } from "react";

/**
 * 単一コントロール用のラベル付きフィールド。
 * label をクリックすると内側のコントロールにフォーカスが移る（label ラップ）。
 * 複数のコントロールをまとめる場合は Fieldset を使う。
 */
export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-label-md text-neutral-900">
        {label}
        {required && (
          <span className="ml-1 text-error-900" aria-hidden>
            *
          </span>
        )}
      </span>
      {hint && <span className="mt-0.5 block text-body-sm text-neutral-600">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && (
        <span className="mt-1 block text-body-sm text-error-900" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

/**
 * 複数のコントロール（日付範囲・チェックボックス群など）をまとめる枠。
 * label を1つのコントロールに紐付けられないケースで fieldset/legend を使う。
 */
export function Fieldset({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="block">
      <legend className="text-label-md text-neutral-900">
        {label}
        {required && (
          <span className="ml-1 text-error-900" aria-hidden>
            *
          </span>
        )}
      </legend>
      {hint && <p className="mt-0.5 text-body-sm text-neutral-600">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </fieldset>
  );
}

// フォーカス・hover・無効・エラー状態を含む共通コントロールスタイル。
// 業務での連続入力を想定し、フォーカスが必ず視認できるようリングを付与する。
const control =
  "w-full rounded-lg border border-neutral-500 bg-neutral-white px-3 py-2.5 text-neutral-900 transition-colors placeholder:text-neutral-500 " +
  "hover:border-neutral-700 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-100 " +
  "disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-500 " +
  "aria-[invalid=true]:border-error-900 aria-[invalid=true]:focus:ring-error-100";

// Input と Select の高さを揃える（フォントサイズ差で行高がずれないよう固定）。
const controlHeight = "h-11";

export function Input({ className = "", type, inputMode, ...props }: ComponentProps<"input">) {
  // 数値入力はスマホでテンキーを出す（明示指定があればそれを優先）。
  const mode = inputMode ?? (type === "number" ? "numeric" : undefined);
  return <input type={type} inputMode={mode} className={`${control} ${controlHeight} text-body-md ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${control} text-body-md min-h-24 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  // 文字サイズ・高さを Input／一覧と揃える（text-body-md・controlHeight）。
  return <select className={`${control} ${controlHeight} text-body-md ${className}`} {...props} />;
}

/**
 * 金額入力。¥ プレフィックスを表示し、数値は右寄せ・等幅で桁を読みやすくする。
 * 業務システムでは料金欄が多いため専用化して見た目と意味を統一する。
 */
export function MoneyInput({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 grid w-9 place-items-center text-body-md text-neutral-600">
        ¥
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        className={`${control} text-body-md pl-9 text-right tabular-nums ${className}`}
        {...props}
      />
    </div>
  );
}
