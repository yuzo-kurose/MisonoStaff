// 遷移直後に即表示するスケルトン（シェルは常駐するためコンテンツ部分のみ）。
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-56 rounded bg-neutral-200" />
      <div className="h-12 rounded-xl bg-neutral-200" />
      <div className="space-y-2">
        <div className="h-16 rounded-xl bg-neutral-200" />
        <div className="h-16 rounded-xl bg-neutral-200" />
        <div className="h-16 rounded-xl bg-neutral-200" />
      </div>
    </div>
  );
}
