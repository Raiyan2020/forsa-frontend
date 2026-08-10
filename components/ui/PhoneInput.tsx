"use client";

import Input from "@/components/ui/Input";
import ModalInput from "@/components/ui/ModalInput";
import { KUWAIT_PHONE_LENGTH } from "@/lib/schema";

type PhoneInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "digitsOnly" | "maxLength" | "inputMode"
>;

type ModalPhoneInputProps = Omit<
  React.ComponentProps<typeof ModalInput>,
  "type" | "digitsOnly" | "maxLength" | "inputMode"
>;

/**
 * Every phone field in the app is a Kuwaiti local number: exactly
 * {@link KUWAIT_PHONE_LENGTH} digits, with the country code living in the
 * separate CountryCodeSelect beside it. Typing is capped at that length rather
 * than only being validated on submit, so the field cannot hold a number the
 * schema will reject.
 *
 * `type="tel"` (not `number`) because number inputs ignore `maxLength`, add a
 * spinner the design does not want, and let `e`/`.`/`+` through.
 */
export default function PhoneInput(props: PhoneInputProps) {
  return (
    <Input
      {...props}
      type="tel"
      digitsOnly
      maxLength={KUWAIT_PHONE_LENGTH}
      inputMode="numeric"
    />
  );
}

/** The same field for the modal-styled forms. */
export function ModalPhoneInput(props: ModalPhoneInputProps) {
  return (
    <ModalInput
      {...props}
      type="tel"
      digitsOnly
      maxLength={KUWAIT_PHONE_LENGTH}
      inputMode="numeric"
    />
  );
}
