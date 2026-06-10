"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/* BarcodeDetector の最小型（lib.dom に無いため宣言） */
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

/**
 * カメラでQRを読み取り、値を onScan で返す。
 * BarcodeDetector 対応ブラウザ（Chrome系）でのみ動作。未対応時はメッセージ表示。
 */
export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" && "BarcodeDetector" in window;

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }

  useEffect(() => () => stop(), []);

  async function start() {
    setError(null);
    if (!supported) {
      setError("このブラウザはカメラ読取に未対応です。トークン入力をご利用ください。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);

      const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor })
        .BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });

      const tick = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const value = codes[0].rawValue;
            stop();
            onScan(value);
            return;
          }
        } catch {
          /* フレーム未準備などは無視して継続 */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("カメラを起動できませんでした。権限を確認してください。");
      stop();
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="warning">{error}</Alert>}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-900">
        <video
          ref={videoRef}
          className={`mx-auto aspect-square w-full max-w-xs object-cover ${active ? "" : "hidden"}`}
          muted
          playsInline
        />
        {!active && (
          <div className="grid aspect-square w-full max-w-xs place-items-center text-body-sm text-neutral-300 mx-auto">
            カメラは停止中です
          </div>
        )}
      </div>
      {active ? (
        <Button variant="secondary" fullWidth onClick={stop}>
          スキャンを停止
        </Button>
      ) : (
        <Button fullWidth onClick={start}>
          📷 カメラでQRをスキャン
        </Button>
      )}
    </div>
  );
}
