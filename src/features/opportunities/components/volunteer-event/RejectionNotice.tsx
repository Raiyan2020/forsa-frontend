"use client";

import { useTranslation } from "react-i18next";

/**
 * Shown on a rejected opportunity, which only its creator can open.
 *
 * `reason` is `rejected_reason`, which the admin writes on rejection but no
 * resource sends yet (BE-80) — so today this renders the heading alone. The
 * line is kept so the reason appears the moment the field ships.
 */
export default function RejectionNotice({ reason }: { reason?: string | null }) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p className="font-bold">{t("COMMON.OPPORTUNITY_REJECTED")}</p>
      {reason && (
        <p className="mt-1">
          {t("COMMON.REJECTION_REASON")}: {reason}
        </p>
      )}
    </div>
  );
}
