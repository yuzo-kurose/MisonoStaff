"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Info, CalendarDays, MapPin, Maximize2, X } from "lucide-react";

/**
 * 受付用QRカード。checkin_token をQR化し、直近イベントまでのカウントダウンを併記する。
 * 「QRを拡大する」で全画面モーダル表示（受付でかざしやすくするため）。
 */
export function QrCard({
  token,
  daysLeft,
  dateLabel,
  venue,
}: {
  token: string;
  daysLeft: number | null;
  dateLabel: string | null;
  venue: string | null;
}) {
  const [zoom, setZoom] = useState(false);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-white p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5">
        <h2 className="text-heading-sm text-neutral-900">受付用QRコード</h2>
        <Info size={15} className="text-neutral-400" />
      </div>
      <p className="mb-4 text-body-sm text-neutral-600">このQRコードを受付でご提示ください</p>

      <div className="flex items-stretch gap-4">
        <div className="grid flex-none place-items-center rounded-xl border border-neutral-200 bg-neutral-white p-2.5">
          <QRCodeSVG value={token} size={132} level="M" />
        </div>
        <div className="flex flex-1 flex-col justify-center rounded-xl bg-neutral-50 px-4 py-3">
          {daysLeft !== null ? (
            <>
              <p className="text-label-sm text-neutral-500">開催まであと</p>
              <p className="leading-none text-neutral-900">
                <span className="text-[2.5rem] font-bold">{daysLeft}</span>
                <span className="ml-1 text-body-md">日</span>
              </p>
              <div className="mt-2 space-y-1 text-body-sm text-neutral-700">
                {dateLabel && (
                  <p className="flex items-center gap-1.5">
                    <CalendarDays size={14} className="flex-none text-neutral-400" />
                    {dateLabel}
                  </p>
                )}
                {venue && (
                  <p className="flex items-center gap-1.5">
                    <MapPin size={14} className="flex-none text-neutral-400" />
                    {venue}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-body-sm text-neutral-600">直近の参加予定はありません。</p>
          )}
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
