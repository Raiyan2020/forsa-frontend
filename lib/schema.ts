import * as Yup from "yup";
import i18n from "@/lib/i18n/config";
import { getPhoneRule } from "@/lib/phoneRules";

export const createSchema = (schema: Record<string, Yup.AnySchema>) => {
  return Yup.object().shape(schema);
};

export const YupRequiredString = Yup.string().required(() =>
  i18n.t("COMMON.REQUIRED.FIELD")
);

export const YupStringNoLeadingTrailingSpaces = YupRequiredString.matches(
  /^(?!\s)/,
  () => i18n.t("COMMON.NO.START.SPACE")
).matches(/(?<!\s)$/, () => i18n.t("COMMON.NO.END.SPACE"));

export const YupEmail = YupStringNoLeadingTrailingSpaces.email(() =>
  i18n.t("COMMON.MUST.BE.VALID.EMAIL")
).matches(
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  i18n.t("COMMON.MUST.BE.VALID.EMAIL")
);

export const YupStringMaxLength = (max: number) => {
  return YupStringNoLeadingTrailingSpaces.max(
    max,
    () =>
      `${i18n.t("COMMON.MUST.BE.ATMOST")}${max}${i18n.t("COMMON.CHARACTERS")}`,
  );
};

export const YupPassword = YupStringNoLeadingTrailingSpaces.min(8, () =>
  i18n.t("COMMON.PASS.8.CHARS"),
);

export const YupStrongPassword = YupStringNoLeadingTrailingSpaces
  .min(8, () => i18n.t("COMMON.PASS.8.CHARS"))
  .matches(/[A-Z]/, () => i18n.t("COMMON.PASS.UPPERCASE"))
  .matches(/[0-9]/, () => i18n.t("COMMON.PASS.NUMBER"))
  .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, () => i18n.t("COMMON.PASS.SPECIAL"))
  .test("password-requirements", () => i18n.t("COMMON.REQUIRED.FIELD"),
    (value) => {
      if (!value) return false;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
      const hasMinLength = value.length >= 8;
      return hasUpperCase && hasNumber && hasSpecialChar && hasMinLength;
    }
  );

/** A Kuwaiti local number — kept for backward compatibility. */
export const KUWAIT_PHONE_LENGTH = 8;

/**
 * Builds a Yup phone schema for the given dial code (e.g. "+965").
 * Dial codes with no registered rule fall back to a 4–15 digit range.
 *
 * The schema enforces:
 *  - digits only
 *  - the country's exact length, or sanity bounds when none is known
 *  - optional leading-digit constraint (e.g. Egypt numbers must start with "1")
 */
export const createPhoneNumberSchema = (dialCode?: string) => {
  const rule = getPhoneRule(dialCode ?? "");
  let schema = YupRequiredString.matches(/^\d+$/, () =>
    i18n.t("COMMON.MUST.BE.VALID.PHONE")
  );

  if (typeof rule.length === "number") {
    const exact = rule.length;
    schema = schema.length(exact, () =>
      i18n.t("COMMON.PHONE.EXACT.DIGITS", { count: exact })
    );
  } else {
    // Countries without a known fixed length only get sanity bounds — better
    // than rejecting every valid number that is not 8 digits long.
    const min = rule.min ?? 4;
    const max = rule.max ?? 15;
    schema = schema
      .min(min, () => i18n.t("COMMON.PHONE.LENGTH.RANGE", { min, max }))
      .max(max, () => i18n.t("COMMON.PHONE.LENGTH.RANGE", { min, max }));
  }
  if (rule.startsWith) {
    const prefix = rule.startsWith;
    schema = schema.matches(
      new RegExp(`^${prefix}`),
      () => i18n.t("COMMON.PHONE.STARTS.WITH", { digit: prefix })
    );
  }
  return schema;
};

/**
 * Backward-compatible alias — validates as Kuwait (+965): exactly 8 digits.
 * Prefer `createPhoneNumberSchema(values.country_code)` in new code.
 */
export const YupPhoneNumber = createPhoneNumberSchema("+965");

/**
 * Registration / licence numbers are digit strings. Optional on some forms
 * (public organizations have none), hence `excludeEmptyString`.
 */
export const YupDigitsOnlyOptional = (max: number) =>
  Yup.string()
    .max(
      max,
      () =>
        `${i18n.t("COMMON.MUST.BE.ATMOST")}${max}${i18n.t("COMMON.CHARACTERS")}`
    )
    .matches(/^\d+$/, {
      message: () => i18n.t("COMMON.ONLY_NUMBERS"),
      excludeEmptyString: true,
    });

// Validation for file size up to 5MB (5 * 1024 * 1024 bytes)
export const YupFileSize = Yup.array()
  .min(1, () => i18n.t("COMMON.REQUIRED.FIELD"))
  .test("fileSize", () => i18n.t("COMMON.FILE.TOO.LARGE"), (files) => {
    return files?.every(file => file instanceof File && file.size <= 2 * 1024 * 1024);
  });

export const YupNumberOnly = YupRequiredString
  .matches(/^\d+$/, () => i18n.t("COMMON.ONLY_NUMBERS")) // Ensures only digits
  .test("valid-number", () => i18n.t("COMMON.VALID_NUMBERS"), (value) => {
    const num = Number(value);
    return !isNaN(num) && num >= 1; // Ensures valid number & at least 1
  });

export const YupDecimalNumber = YupRequiredString
  .matches(/^\d*\.?\d+$/, () => i18n.t("COMMON.ONLY_NUMBERS")) // Allows digits and optional decimal point
  .test("valid-decimal", () => i18n.t("COMMON.VALID_NUMBERS"), (value) => {
    const num = Number(value);
    return !isNaN(num) && num >= 0; // Ensures valid number & non-negative
  });

// Custom URL validation that's more forgiving for user input
export const YupFlexibleUrl = YupRequiredString.test(
  "is-valid-url",
  () => i18n.t("COMMON.INVALID.URL"),
  function (value) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return false;
    }

    try {
      if (!/^https?:\/\//i.test(value)) {
        value = 'https://' + value;
      }

      new URL(value);
      return true;
    } catch (e) {
      return false;
    }
  }
);

// Optional URL — same lenient parsing as YupFlexibleUrl, but blank passes.
export const YupOptionalUrl = Yup.string().test(
  "is-valid-optional-url",
  () => i18n.t("COMMON.INVALID.URL"),
  function (value) {
    if (!value || value.trim() === "") {
      return true;
    }

    let normalizedValue = value.trim();
    if (!/^https?:\/\//i.test(normalizedValue)) {
      normalizedValue = "https://" + normalizedValue;
    }

    try {
      new URL(normalizedValue);
      return true;
    } catch {
      return false;
    }
  }
);

// WhatsApp link validation
export const YupWhatsAppLink = Yup.string().test(
  "is-valid-whatsapp-link",
  () => i18n.t("COMMON.INVALID.WHATSAPP.LINK"),
  function (value) {
    if (!value || value.trim() === '') {
      return true;
    }

    const normalizedValue = value.trim();

    // The scheme is required, not inferred — "wa.me/123..." on its own is
    // rejected rather than silently treated as "https://wa.me/123...".
    if (!/^https:\/\//i.test(normalizedValue)) {
      return false;
    }

    try {
      const url = new URL(normalizedValue);
      const hostname = url.hostname.toLowerCase();
      const pathname = url.pathname;

      const validDomains = [
        'wa.me',
        'api.whatsapp.com',
        'whatsapp.com',
        'www.whatsapp.com',
        'chat.whatsapp.com',
        'web.whatsapp.com'
      ];

      const isValidDomain = validDomains.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain)
      );

      if (!isValidDomain) {
        return false;
      }

      if (hostname === 'wa.me') {
        const phoneMatch = pathname.match(/^\/(\d{7,15})/);
        if (!phoneMatch) {
          return false;
        }
      }

      if (hostname === 'chat.whatsapp.com') {
        const hasValidPath = /^\/([A-Za-z0-9_-]+)/.test(pathname);
        if (!hasValidPath) {
          return false;
        }
      }

      if (hostname === 'api.whatsapp.com') {
        const hasPhone = url.searchParams.has('phone');
        if (!hasPhone) {
          return false;
        }
        const phone = url.searchParams.get('phone');
        if (!phone || !/^\d{7,15}$/.test(phone)) {
          return false;
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }
).nullable();

// Validation for Civil ID: 12 digits starting with 2 or 3
export const YupCivilId = YupRequiredString
  .matches(/^[23]\d{11}$/, () => i18n.t("COMMON.CIVIL_ID_INVALID"))
  .length(12, () => i18n.t("COMMON.CIVIL_ID_LENGTH"));

// ─── Date of birth ───────────────────────────────────────────────────────────

/** Youngest age allowed to open a volunteer account. */
export const MIN_SIGNUP_AGE = 10;

/**
 * Age in whole years from a `yyyy-MM-dd` date of birth (the format
 * `BirthDateField` writes), or null when the value is missing/unparseable.
 *
 * The parts are read off the string rather than through `new Date(value)`:
 * that parses a bare date as UTC midnight, which lands on the previous day in
 * negative-offset timezones and shifts the age by a year on birthdays.
 */
export const calculateAgeFromDob = (dob: string): number | null => {
  if (!dob) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const today = new Date();

  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }
  return age;
};

/** The latest date of birth that still satisfies `minAge` — the picker's `maxDate`. */
export const maxDateOfBirthFor = (minAge: number): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - minAge);
  return date;
};

/**
 * Date of birth that must be at least `minAge` years in the past. The picker
 * caps the calendar at the same date, but the field also accepts typed input —
 * this is what actually blocks an under-age (or future) date.
 */
export const YupDateOfBirth = (minAge: number = MIN_SIGNUP_AGE) =>
  YupStringMaxLength(10)
    .concat(YupRequiredString)
    .test(
      "min-age",
      () => i18n.t("COMMON.MIN_AGE_REQUIRED", { age: minAge }),
      (value) => {
        if (!value) return true; // emptiness is the required rule's business
        const age = calculateAgeFromDob(value);
        return age !== null && age >= minAge;
      }
    );
