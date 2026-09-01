"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

interface TagsCheckboxProps {
  name: string;
  label: string;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  setFieldTouched: (
    field: string,
    isTouched?: boolean,
    shouldValidate?: boolean
  ) => void;
  values: string[] | undefined;
  errors?: string | string[];
  touched?: boolean;
  notTransparent?: boolean;
  options: { id: string; label: string }[];
  disabled?: boolean;
}

export const TagsCheckbox = ({
  name,
  setFieldValue,
  setFieldTouched,
  values = [], // Default to empty array if undefined
  errors,
  touched,
  notTransparent = false,
  options,
  disabled,
}: TagsCheckboxProps) => {
  const [, setIsFocused] = useState(false);
  const { t } = useTranslation();

  const handleCheckboxChange = (option: string) => {
    const newValues = values.includes(option)
      ? values.filter((value) => value !== option)
      : [...values, option];

    setFieldValue(name, newValues, false);
    setTimeout(() => {
      setFieldTouched(name, true, true);
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setFieldTouched(name, true, true);
  };

  return (
    <div className="relative w-full mb-4">
      <div
        className={`flex flex-wrap gap-y-[14px] gap-x-[5px] px-3 pb-6 pt-5 border rounded-2xl min-h-[48px] items-center
          ${notTransparent ? "bg-white" : "bg-[#29246D]/[0.03]"}
          ${touched && errors ? "border-red-500" : "border-[#29246D1A]/10"}`}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      >
        <span className="text-primary-5 transition-all duration-200 placeholder-primary-5 lg:text-base md:text-sm text-sm pr-3">
          {t("COMMON.ENTER_TAGS")}
        </span>
        {options.map((option, index) => (
          <label
            key={index}
            className={`flex items-center px-3 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors
              ${
                values.includes(option.id)
                  ? "bg-primary-5 text-white" // Blue background when checked
                  : "bg-white text-primary-5 border border-primary-5" // White background when unchecked
              }`}
          >
            <input
              type="checkbox"
              value={option.id}
              checked={values.includes(option.id)}
              onChange={() => handleCheckboxChange(option.id)}
              className="hidden" // Hide the default checkbox
              disabled={disabled}
            />
            <span className="text-[15px]">{option.label}</span>
          </label>
        ))}
      </div>
      {touched && errors && (
        <div className="text-red-500 text-sm mt-1">{errors}</div>
      )}
    </div>
  );
};

export default TagsCheckbox;
