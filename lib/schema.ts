import * as Yup from "yup";
import i18n from "@/lib/i18n/config";

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

export const YupPhoneNumber = YupRequiredString
  .matches(/^\d+$/, () => i18n.t("COMMON.MUST.BE.VALID.PHONE"))
  .length(8, () => i18n.t("COMMON.PHONE.EXACT.8.DIGITS"));

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

// WhatsApp link validation
export const YupWhatsAppLink = Yup.string().test(
  "is-valid-whatsapp-link",
  () => i18n.t("COMMON.INVALID.WHATSAPP.LINK"),
  function (value) {
    if (!value || value.trim() === '') {
      return true;
    }

    let normalizedValue = value.trim();

    if (!/^https?:\/\//i.test(normalizedValue)) {
      normalizedValue = 'https://' + normalizedValue;
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
