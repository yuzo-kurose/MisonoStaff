"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";
import { updateMyHeroImage } from "./actions";

const BUCKET = "profile-images";
const MAX_MB = 5;

/** マイページのヒーロー画像をアップロード／削除する。Supabase Storage に保存し URL を profiles に保存。 */
export function HeroImageCard({ userId, currentUrl }: { userId: string; currentUrl: string | null }) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File) {
    setMsg(null);
    if (!file.type.startsWith("image/")) {
      setMsg({ ok: false, text: "画像ファイルを選択してください。" });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setMsg({ ok: false, text: `画像は${MAX_MB}MB以下にしてください。` });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    // user_id/ で始まるパス（RLSで本人のみ書き込み可）。キャッシュ更新のため時刻を付与。
    const path = `${userId}/hero-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });
    if (upErr) {
      setLoading(false);
      setMsg({ ok: false, text: `アップロードに失敗：${upErr.message}` });
      return;
    }
    const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const res = await updateMyHeroImage(url);
    setLoading(false);
    if (!res.ok) {
      setMsg({ ok: false, text: `保存に失敗：${res.error}` });
      return;
    }
    setPreview(url);
    setMsg({ ok: true, text: "ヒーロー画像を更新しました。" });
    router.refresh();
  }

  async function onReset() {
    setMsg(null);
    setLoading(true);
    const res = await updateMyHeroImage(null);
    setLoading(false);
    if (!res.ok) {
      setMsg({ ok: false, text: `更新に失敗：${res.error}` });
      return;
    }
    setPreview(null);
    setMsg({ ok: true, text: "既定の画像に戻しました。" });
    router.refresh();
  }

  return (
    <CollapsibleCard title="ヒーロー画像">
      <p className="mb-3 text-body-sm text-neutral-600">
        マイページ上部に表示される画像を変更できます（{MAX_MB}MB以下の画像）。
      </p>

      {msg && (
        <div className="mb-3">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      <div className="relative mb-4 h-40 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
        {/* プレビュー（ローカル画像/外部URLの双方を扱うため img を使用） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview || "/syuugou.jpeg"}
          alt="ヒーロー画像プレビュー"
          className="h-full w-full object-cover"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={loading} onClick={() => fileRef.current?.click()}>
          <ImagePlus size={18} /> {loading ? "処理中…" : "画像をアップロード"}
        </Button>
        {preview && (
          <Button type="button" variant="secondary" disabled={loading} onClick={onReset}>
            <Trash2 size={16} /> 既定に戻す
          </Button>
        )}
      </div>
    </CollapsibleCard>
  );
}
