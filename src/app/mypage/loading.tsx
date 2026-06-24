// 遷移直後に即表示されるスケルトン（シェルは常駐するためコンテンツ部分のみ）。
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-neutral-200" />
      <div className="h-40 rounded-2xl bg-neutral-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-2xl bg-neutral-200" />
        <div className="h-28 rounded-2xl bg-neutral-200" />
      </div>
    </div>
  );
}
