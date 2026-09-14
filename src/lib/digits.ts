/**
 * Digit normalization — the app renders Western (ASCII) digits everywhere.
 *
 * The API localizes numeric fields per the request's language header: the
 * backend's `ar_num()` helper (`app/Support/helpers.php:262`) rewrites numbers
 * into Eastern Arabic digits whenever the locale is `ar`, so an Arabic session
 * receives `"٧٩٧"` where an English one receives `797`. That reaches the UI as
 * a *string*, which is why `Number("٧٩٧")` is `NaN` and a plain `> 0` check
 * silently fails.
 *
 * The product decision is that digits do not follow the UI language — `12345`
 * is rendered in both English and Arabic. Rather than patching each render
 * site, responses are normalized once at the axios boundary (see
 * `lib/api/client.ts`), so every consumer downstream sees ASCII digits.
 *
 * Only digit and numeric-separator codepoints are rewritten. Arabic letters,
 * punctuation and everything else pass through untouched, so this is safe to
 * run over prose fields as well as numeric ones.
 */

/** U+0660–U+0669 — Arabic-Indic, what `ar_num()` emits. */
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
/** U+06F0–U+06F9 — Extended Arabic-Indic (Persian/Urdu), handled defensively. */
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

const DIGIT_PATTERN = /[٠-٩۰-۹]/g;
/** U+066B Arabic decimal separator, U+066C Arabic thousands separator. */
const SEPARATOR_PATTERN = /[٫٬]/g;

/**
 * Rewrite every Arabic-Indic digit in a string to its ASCII equivalent.
 *
 * Decimal and thousands separators are mapped too, so `"١٬٢٣٤٫٥"` becomes
 * `"1,234.5"` and stays parseable by `Number()` / `parseFloat()`.
 */
export const toWesternDigits = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (!DIGIT_PATTERN.test(raw) && !SEPARATOR_PATTERN.test(raw)) return raw;
  // `test()` advances lastIndex on a /g regex — reset before reusing.
  DIGIT_PATTERN.lastIndex = 0;
  SEPARATOR_PATTERN.lastIndex = 0;

  return raw
    .replace(DIGIT_PATTERN, (digit) => {
      const arabic = ARABIC_INDIC.indexOf(digit);
      if (arabic !== -1) return String(arabic);
      return String(EXTENDED_ARABIC_INDIC.indexOf(digit));
    })
    .replace(SEPARATOR_PATTERN, (separator) =>
      separator === "٫" ? "." : ","
    );
};

/**
 * Parse a value that may carry Arabic-Indic digits into a real number.
 *
 * Returns 0 rather than NaN so callers can compare and sum without guarding —
 * every call site here treats a missing count as zero.
 */
export const parseLocalizedNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return 0;
  // Strip grouping separators so "1,234" parses as 1234 rather than 1.
  const parsed = parseFloat(toWesternDigits(value).replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Deep-normalize an API payload in place-free fashion: strings are rewritten,
 * arrays and plain objects are rebuilt, everything else is returned as-is.
 *
 * Non-plain objects (File, Blob, Date, FormData) are passed through untouched —
 * rebuilding them would strip their prototype, and none of them carry
 * localized digits.
 */
export const normalizeDigitsDeep = <T>(data: T): T => {
  if (typeof data === "string") {
    return toWesternDigits(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => normalizeDigitsDeep(item)) as unknown as T;
  }

  if (data === null || typeof data !== "object") return data;

  // Only walk plain objects — anything with a custom prototype is left alone.
  const prototype = Object.getPrototypeOf(data);
  if (prototype !== Object.prototype && prototype !== null) return data;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    result[key] = normalizeDigitsDeep(value);
  }
  return result as T;
};
