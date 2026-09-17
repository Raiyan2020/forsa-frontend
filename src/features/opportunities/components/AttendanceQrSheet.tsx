"use client";

import QRCode from "react-qr-code";

interface AttendanceQrSheetProps {
  /** The raw payload string from the API — never a URL, never an image. */
  code: string;
  /** What this sheet is for, e.g. «رمز الحضور». Printed large above the code. */
  label: string;
  /** The opportunity's title, so a stack of printed sheets stays sortable. */
  caption?: string;
  /** Rendered under the code when the code expires — learn & serve only. */
  footnote?: string;
}

/**
 * One printable QR sheet.
 *
 * The API hands back a raw string by design ("QR image rendering and camera
 * scanning are entirely your side's responsibility"), so the code is drawn here
 * with `react-qr-code` — an SVG, which is what makes it print sharp at any
 * paper size instead of pixelating like a canvas or a server PNG would.
 *
 * `level="M"` and a white quiet zone are not decoration: these sheets get
 * printed, taped to a wall and scanned in poor light at an angle, so the error
 * correction and the margin are what keep them readable.
 */
export default function AttendanceQrSheet({
  code,
  label,
  caption,
  footnote,
}: AttendanceQrSheetProps) {
  return (
    <div className="qr-print-page flex flex-col items-center gap-4 rounded-[16px] border border-[#E5E5EF] bg-white p-6">
      <h3 className="text-center text-xl font-bold text-primary-5">{label}</h3>
      {caption ? (
        <p className="text-center text-sm font-semibold text-secondary-102">
          {caption}
        </p>
      ) : null}

      {/* The white padding is the QR "quiet zone" — a scanner needs it, and the
          card's own background cannot be relied on once this is printed. */}
      <div className="rounded-[12px] bg-white p-4">
        <QRCode
          value={code}
          size={220}
          level="M"
          className="h-[220px] w-[220px]"
        />
      </div>

      {footnote ? (
        <p className="text-center text-sm font-semibold text-primary-801">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
