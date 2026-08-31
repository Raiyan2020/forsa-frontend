/**
 * Per-country phone number rules, keyed by dial code (e.g. "+965").
 *
 * `length`     – the exact number of local digits required.
 * `startsWith` – if set, the number must begin with this digit string.
 *
 * When a dial code is not listed here the `DEFAULT_PHONE_RULE` fallback
 * applies: 8 digits, no prefix constraint.
 */
export interface PhoneRule {
  /** The exact number of local digits, for countries with a single length. */
  length?: number;
  /** Inclusive bounds, used when no exact length is known for the country. */
  min?: number;
  max?: number;
  /** First digit(s) the number must start with, e.g. "1" for Egypt. */
  startsWith?: string;
}

export const PHONE_RULES: Record<string, PhoneRule> = {
  "+965": { length: 8 },                     // Kuwait
  "+20":  { length: 10, startsWith: "1" },   // Egypt
  "+966": { length: 9 },                     // Saudi Arabia
  "+971": { length: 9 },                     // UAE
  "+973": { length: 8 },                     // Bahrain
  "+962": { length: 9 },                     // Jordan
  "+968": { length: 8 },                     // Oman
  "+974": { length: 8 },                     // Qatar
};

/**
 * Fallback for the ~235 countries the selector offers that are not listed
 * above. A fixed 8 was wrong for most of them — a US or Indian number is 10
 * digits and was being truncated on entry, then rejected on submit. E.164 caps
 * the whole number at 15 digits, so the local part cannot exceed that.
 */
export const DEFAULT_PHONE_RULE: PhoneRule = { min: 4, max: 15 };

/**
 * Returns the phone rule for the given dial code, or the default if none
 * is registered.
 *
 * @example
 *   getPhoneRule("+965") // { length: 8 }
 *   getPhoneRule("+20")  // { length: 10, startsWith: "1" }
 */
export function getPhoneRule(dialCode: string): PhoneRule {
  return PHONE_RULES[dialCode] ?? DEFAULT_PHONE_RULE;
}

/** The `maxLength` an input should enforce for a rule. */
export function getPhoneMaxLength(rule: PhoneRule): number {
  return rule.length ?? rule.max ?? DEFAULT_PHONE_RULE.max ?? 15;
}
