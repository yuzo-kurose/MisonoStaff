"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * 受付用QR。profiles.checkin_token をエンコードして表示する。
 * 受付画面のスキャナーがこの値を読み取り、当日の全イベントを一括受付する。
 */
export function QrPlaceholder({ token }: { token: string }) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="rounded-lg border border-neutral-300 bg-neutral-white p-3">
        <QRCodeSVG value={token} size={176} level="M" />
      </div>
      <span className="text-label-sm text-neutral-600">受付用QR（人単位）</span>
    </div>
  );
}
