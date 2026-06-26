"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Maximize2, X, QrCode } from "lucide-react";

/**
 * 受付用QRカード。checkin_token をQR化して表示する。
 * 「QRを拡大する」で全画面モーダル表示（受付でかざしやすくするため）。
 */
export function QrCard({ token }: { token: string }) {
  const [zoom, setZoom] = useState(false);

  return (
    <div className="rounded-2xl border border-neutral-200 border-t-[3px] border-t-primary-700 bg-neutral-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 border-b border-primary-700 pb-3">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary-50 text-primary-700">
          <QrCode size={17} />
        </span>
        <h2 className="text-heading-sm text-neutral-900">受付用QRコード</h2>
      </div>
      <p className="mb-4 text-body-sm text-neutral-600">このQRコードを受付でご提示ください</p>

      <div className="flex justify-center">
        <div className="grid flex-none place-items-center rounded-xl border border-neutral-200 bg-neutral-white p-3">
          <QRCodeSVG value={token} size={160} level="M" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setZoom(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 py-2.5 text-body-md text-neutral-800 transition-colors hover:bg-neutral-50"
      >
        <Maximize2 size={16} /> QRを拡大する
      </button>

      {zoom && (
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-neutral-900/70 p-4"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-neutral-white p-6 text-center shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoom(false)}
              aria-label="閉じる"
              className="absolute right-3 top-3 rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
            >
              <X size={18} />
            </button>
            <p className="mb-4 text-heading-sm text-neutral-900">受付用QRコード</p>
            <div className="grid place-items-center rounded-xl border border-neutral-200 p-4">
              <QRCodeSVG value={token} size={260} level="M" />
            </div>
            <p className="mt-4 text-body-sm text-neutral-600">受付でこの画面をご提示ください。</p>
          </div>
        </div>
      )}
    </div>
  );
}
