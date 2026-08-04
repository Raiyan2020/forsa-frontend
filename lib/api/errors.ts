/**
 * The API reports failures as
 *
 *   { key: "fail", msg: "Validation error", code: 422,
 *     response_status: { error: true, validation_errors: { civil_id: ["..."] } } }
 *
 * The messages are already localized by the backend from the `x-lang` / `Lang`
 * request header, so there is nothing to pick per language here.
 *
 * An older revision returned `{ errors: { civil_id: { en, ar } } }` instead, and
 * a fair amount of the app still reads that shape. Both are handled so a screen
 * can be migrated without waiting on every endpoint.
 */

type LegacyFieldError = Record<string, string>;

interface ErrorPayload {
  msg?: string;
  response_status?: {
    validation_errors?: Record<string, string[] | string> | unknown[];
  };
  errors?: Record<string, LegacyFieldError | string[] | string>;
}

/** Unwrap an axios error, a `fetch().json()` body, or an already-unwrapped payload. */
function getPayload(error: unknown): ErrorPayload | null {
  if (!error || typeof error !== "object") return null;
  const maybeAxios = error as { response?: { data?: unknown } };
  const body = maybeAxios.response?.data ?? error;
  return body && typeof body === "object" ? (body as ErrorPayload) : null;
}

function firstString(value: unknown, language: string): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const found = value.find((entry) => typeof entry === "string");
    return typeof found === "string" ? found : null;
  }
  if (value && typeof value === "object") {
    // Legacy `{ en, ar }` shape.
    const localized = value as LegacyFieldError;
    return localized[language] || localized.en || localized.ar || null;
  }
  return null;
}

/**
 * Field name → message, for the fields the API rejected. Empty when the failure
 * carried no per-field detail (network error, 500, plain `msg`-only response).
 */
export function getApiFieldErrors(
  error: unknown,
  language = "en"
): Record<string, string> {
  const payload = getPayload(error);
  if (!payload) return {};

  const raw = payload.response_status?.validation_errors ?? payload.errors;
  // A success-shaped envelope carries `validation_errors: []`.
  if (!raw || Array.isArray(raw) || typeof raw !== "object") return {};

  const fields: Record<string, string> = {};
  for (const [field, value] of Object.entries(raw)) {
    const message = firstString(value, language);
    if (message) fields[field] = message;
  }
  return fields;
}

/** Every message the API returned, in field order, falling back to `msg`. */
export function getApiErrorMessages(
  error: unknown,
  language = "en"
): string[] {
  const messages = Object.values(getApiFieldErrors(error, language));
  if (messages.length > 0) return messages;

  const msg = getPayload(error)?.msg;
  return typeof msg === "string" && msg ? [msg] : [];
}

/** The single message worth showing, or `fallback` when the API said nothing useful. */
export function getApiErrorMessage(
  error: unknown,
  language = "en",
  fallback = ""
): string {
  return getApiErrorMessages(error, language)[0] || fallback;
}
