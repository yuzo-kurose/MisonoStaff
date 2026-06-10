import { Spinner } from "@/components/ui/Spinner";

/** ページのデータ取得中に表示される共通ローディング画面（App Router の Suspense フォールバック）。 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} />
        <p className="text-body-sm text-neutral-600">読み込み中…</p>
      </div>
    </div>
  );
}
