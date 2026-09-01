"use client";

import { useEffect, useState } from "react";
import { FormikValues, useFormikContext } from "formik";
import FlagsSelect from "react-flags-select";
import { countryLabels } from "@/data/countryLabels";
import { useTranslation } from "react-i18next";

interface CountryCodeSelectProps {
  name: string;
  disabled?: boolean;
  index?: number;
  className?: string;
  onChange?: (value: string) => void;
  value?: string;
  initialValue?: string;
}

const CountryCodeSelect = ({
  name,
  disabled,
  index,
  className,
  onChange,
  value,
  initialValue,
}: CountryCodeSelectProps) => {
  const { t } = useTranslation();
  const { setFieldValue, values } = useFormikContext<FormikValues>();
  const [initialized, setInitialized] = useState(false);

  const findShortCodeByDialCode = (dialCode: string): string => {
    if (!dialCode) return "SA";
    const entries = Object.entries(countryLabels);
    const matchingEntry = entries.find(([, label]) => label.secondary === dialCode);
    return matchingEntry ? matchingEntry[0] : "SA";
  };

  const getFieldValues = () => {
    if (value !== undefined) {
      return {
        countryCode: value,
        countryShortCode: findShortCodeByDialCode(value),
      };
    }

    const formikValue = values[name];
    if (formikValue) {
      return {
        countryCode: formikValue,
        countryShortCode: findShortCodeByDialCode(formikValue),
      };
    }

    if (!initialized && initialValue) {
      return {
        countryCode: initialValue,
        countryShortCode: findShortCodeByDialCode(initialValue),
      };
    }

    if (typeof index === "number") {
      return {
        countryCode: values.rows?.[index]?.countryCode,
        countryShortCode: values.rows?.[index]?.countryShortCode,
      };
    }

    return {
      countryCode: "",
      countryShortCode: "",
    };
  };

  const setFields = (code: string, shortCode: string) => {
    if (typeof index === "number") {
      setFieldValue(`rows.${index}.countryCode`, code);
      setFieldValue(`rows.${index}.countryShortCode`, shortCode);
    } else {
      setFieldValue(name, code);
    }
    setInitialized(true);
  };

  useEffect(() => {
    const { countryCode } = getFieldValues();
    if (!countryCode) {
      setFields("+965", "KW");
    } else if (initialValue && !initialized) {
      setFields(initialValue, findShortCodeByDialCode(initialValue));
    }
  }, [initialValue, initialized]);

  useEffect(() => {
    const searchInput = document.querySelector(
      ".ReactFlagsSelect-module_filterBox__3m8EU input"
    );
    if (searchInput) {
      searchInput.setAttribute("placeholder", t("COMMON.SEARCHPLACEHOLDER"));
    }
  }, [t]);

  const handleSelect = (countryShortCode: string) => {
    const dialCode =
      countryLabels[countryShortCode as keyof typeof countryLabels]?.secondary;
    if (dialCode) {
      setFields(dialCode, countryShortCode);
      if (onChange) {
        onChange(dialCode);
      }
    }
  };

  const { countryShortCode } = getFieldValues();

  return (
    <div className={`relative w-full mb-4 ${className || ""}`}>
      <div className="relative">
        <FlagsSelect
          selected={countryShortCode}
          onSelect={handleSelect}
          searchable={true}
          disabled={disabled}
          className={`w-full pt-2 pl-[1px] border rounded-2xl h-[48px] bg-[#29246D]/[0.03] placeholder-black focus:outline-none ${
            disabled
              ? "bg-gray-100 text-gray-500"
              : "border-[#29246D1A]/10 text-secondary-500"
          }`}
          selectButtonClassName="w-full text-left lg:text-base md:text-xs"
          showSelectedLabel={false}
          showSecondarySelectedLabel={true}
          showOptionLabel={true}
          showSecondaryOptionLabel={true}
          customLabels={countryLabels}
          countries={Object.keys(countryLabels)}
          placeholder={t("COMMON.SEARCHPLACEHOLDER")}
        />
      </div>
    </div>
  );
};

export default CountryCodeSelect;
export { CountryCodeSelect };
