import { toast } from "sonner";

import {
  getApiErrorMessages,
  getApiFieldErrors,
  isApiSuccess,
} from "@/lib/api/errors";

/**
 * `/account/`, `/volunteer-profile/` and `/organizer-profile/` name a few
 * fields differently from the form that feeds them, so a rejected field would
 * otherwise attach its message to nothing.
 */
const FIELD_TO_FORM_FIELD: Record<string, string> = {
  experience: "experience_field",
  interest_ids: "_interests",
  new_documents: "documents",
  "new_documents[]": "documents",
};

interface ReportOptions {
  /** Thrown axios error, or an envelope that came back 200 with `key: "fail"`. */
  error: unknown;
  language: string;
  setFieldError: (field: string, message: string | undefined) => void;
  /** Shown only when the API returned no usable message at all. */
  fallback: string;
}

/**
 * Surface what the API actually rejected: inline on the field when it names one
 * (`response_status.validation_errors`, or the legacy `errors` shape), and as a
 * toast either way — a duplicate `civil_id` is reported for a field that may be
 * scrolled out of view, so the generic "update failed" toast used to be the only
 * thing the user saw.
 */
export function reportAccountUpdateError({
  error,
  language,
  setFieldError,
  fallback,
}: ReportOptions): void {
  const fields = getApiFieldErrors(error, language);
  for (const [field, message] of Object.entries(fields)) {
    setFieldError(FIELD_TO_FORM_FIELD[field] ?? field, message);
  }

  const messages = getApiErrorMessages(error, language);
  if (messages.length === 0) {
    toast.error(fallback);
    return;
  }
  for (const message of new Set(messages)) {
    toast.error(message);
  }
}

/**
 * The API answers a rejected write with HTTP 200 and `key: "fail"` often enough
 * that a resolved mutation is not proof of success. Reports the failure the same
 * way and returns false so the caller can stop before the success toast.
 */
export function assertAccountUpdateSucceeded(
  response: unknown,
  options: Omit<ReportOptions, "error">
): boolean {
  if (isApiSuccess(response)) return true;
  reportAccountUpdateError({ ...options, error: response });
  return false;
}
