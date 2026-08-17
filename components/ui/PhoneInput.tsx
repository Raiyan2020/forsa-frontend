"use client";

import { useEffect } from "react";
import { useField } from "formik";
import Input from "@/components/ui/Input";
import ModalInput from "@/components/ui/ModalInput";
import { getPhoneMaxLength, getPhoneRule } from "@/lib/phoneRules";

/**
 * Trims a number that no longer fits the selected country.
 *
 * `maxLength` stops the visitor typing past the limit but does nothing to a
 * value that is already in the field — which is the normal case on the account
 * screens, where the number arrives prefilled from the API. Switching from a
 * 10-digit country to an 8-digit one would otherwise leave ten digits sitting
 * in a field that claims to hold eight, failing only on submit.
 */
function useClampToCountryLength(name: string, maxLength: number) {
  const [{ value }, , { setValue }] = useField<string>(name);

  useEffect(() => {
    if (typeof value === "string" && value.length > maxLength) {
      setValue(value.slice(0, maxLength));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLength]);
}

type PhoneInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "digitsOnly" | "maxLength" | "inputMode"
> & {
  /**
   * The dial code selected in the adjacent CountryCodeSelect (e.g. "+965").
   * When provided the input cap and validation length are derived from the
   * matching country rule; defaults to Kuwait (8 digits) when omitted.
   */
  countryCode?: string;
};

type ModalPhoneInputProps = Omit<
  React.ComponentProps<typeof ModalInput>,
  "type" | "digitsOnly" | "maxLength" | "inputMode"
> & {
  /** @see PhoneInputProps.countryCode */
  countryCode?: string;
};

/**
 * Phone number field whose maximum length automatically adjusts to the
 * country selected in the sibling CountryCodeSelect.
 *
 * Pass `countryCode={values.country_code}` (the dial code, e.g. "+965") from
 * your Formik render to activate country-aware capping. When the prop is
 * omitted the field falls back to Kuwait's 8-digit rule.
 *
 * `type="tel"` (not `number`) because number inputs ignore `maxLength`, add a
 * spinner the design does not want, and let `e`/`.`/`+` through.
 */
export default function PhoneInput({ countryCode, ...props }: PhoneInputProps) {
  const maxLength = getPhoneMaxLength(getPhoneRule(countryCode ?? ""));
  useClampToCountryLength(props.name, maxLength);
  return (
    <Input
      {...props}
      type="tel"
      digitsOnly
      maxLength={maxLength}
      inputMode="numeric"
    />
  );
}

/** The same field for the modal-styled forms. */
export function ModalPhoneInput({ countryCode, ...props }: ModalPhoneInputProps) {
  const maxLength = getPhoneMaxLength(getPhoneRule(countryCode ?? ""));
  useClampToCountryLength(props.name, maxLength);
  return (
    <ModalInput
      {...props}
      type="tel"
      digitsOnly
      maxLength={maxLength}
      inputMode="numeric"
    />
  );
}
