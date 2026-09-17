"use client";

import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import AttendanceQrSheet from "./AttendanceQrSheet";

export interface AttendanceQrSheetData {
  code: string;
  label: string;
  caption?: string;
  footnote?: string;
}

interface AttendanceQrModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One sheet for learn & serve, two (IN and OUT) for volunteering. */
  sheets: AttendanceQrSheetData[];
  isLoading?: boolean;
  /** Already-localized failure text from the API, shown in place of the sheets. */
  error?: string | null;
  /** Shown above the sheets — how this particular code is meant to be used. */
  instructions?: string;
}

/**
 * The organizer's view of the attendance codes, built to be printed from.
 *
 * Printing goes through the browser rather than a generated PDF: the sheets are
 * already SVG, `@media print` in `globals.css` hides everything else on the
 * page, and each sheet breaks onto its own page — an organizer needs the
 * arrival and departure codes on separate walls, not on one sheet of paper.
 */
export default function AttendanceQrModal({
  open,
  onClose,
  title,
  sheets,
  isLoading = false,
  error = null,
  instructions,
}: AttendanceQrModalProps) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="flex flex-col gap-5 pb-4">
        {isLoading ? (
          <Loader />
        ) : error ? (
          <p className="qr-print-hide text-center text-base font-semibold text-red-500">
            {error}
          </p>
        ) : (
          <>
            {instructions ? (
              <p className="qr-print-hide text-center text-sm font-semibold text-secondary-102">
                {instructions}
              </p>
            ) : null}

            <div className="qr-print-area flex flex-col gap-5 sm:flex-row sm:justify-center">
              {sheets.map((sheet) => (
                <AttendanceQrSheet key={sheet.code} {...sheet} />
              ))}
            </div>
          </>
        )}

        <div className="qr-print-hide flex justify-center gap-5">
          {!isLoading && !error && sheets.length > 0 && (
            <Button
              variant="primary"
              size="medium"
              type="button"
              className="xss:!w-full"
              onClick={() => window.print()}
            >
              {t("COMMON.PRINT")}
            </Button>
          )}
          <Button
            variant="secondary"
            size="medium"
            type="button"
            className="xss:!w-full"
            onClick={onClose}
          >
            {t("COMMON.CLOSE")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
