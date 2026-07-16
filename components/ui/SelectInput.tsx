"use client";

import { useField } from "formik";
import { useState } from "react";
import Select, { ActionMeta, SingleValue, components } from "react-select";
import { useLanguageStore } from "@/store/languageStore";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/helpers";

interface SelectInputProps {
  name: string;
  label: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  isClearable?: boolean;
  disabled?: boolean;
  isModal?: boolean;
  isLoading?: boolean;
  onChange?: (
    option: SingleValue<{ label: string; value: string; value_en?: string }>,
    actionMeta: ActionMeta<{ label: string; value: string; value_en?: string }>
  ) => void;
  onInputChange?: (value: any) => void;
  onMenuScrollToBottom?: (e: React.UIEvent<HTMLDivElement>) => void;
  isSearchable?: boolean;
}

const DropdownIndicator = (props: any) => {
  return (
    <components.DropdownIndicator {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: props.selectProps.menuIsOpen
            ? "rotate(180deg)"
            : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}
      >
        <path
          d="M4 6L8 10L12 6"
          stroke="#29246D"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </components.DropdownIndicator>
  );
};

const LoadingMessage = (props: any) => {
  const { t } = useTranslation();
  return (
    <components.LoadingMessage {...props}>
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="w-5 h-5 border-2 border-primary-5 border-t-transparent rounded-full animate-spin" />
        <span className="text-primary-5 text-sm font-medium">
          {t("COMMON.LOADING") || "Loading..."}
        </span>
      </div>
    </components.LoadingMessage>
  );
};

const NoOptionsMessage = (props: any) => {
  const { t } = useTranslation();
  return (
    <components.NoOptionsMessage {...props}>
      <div className="flex flex-col items-center justify-center gap-2 py-4 text-gray-400">
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <span className="text-sm font-medium">
          {props.selectProps.isLoading
            ? t("COMMON.LOADING") || "Loading..."
            : t("COMMON.NO_DATA") || "No options"}
        </span>
      </div>
    </components.NoOptionsMessage>
  );
};

const SelectInput: React.FC<SelectInputProps> = ({
  name,
  label,
  options,
  disabled = false,
  isClearable = false,
  isModal = false,
  isLoading = false,
  className = "",
  onChange,
  onInputChange,
  onMenuScrollToBottom,
  isSearchable = false,
}) => {
  const [field, meta, helpers] = useField(name);
  const [isFocused, setIsFocused] = useState(false);
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();

  const handleChange = (
    option: SingleValue<{ label: string; value: string; value_en?: string }>,
    actionMeta: ActionMeta<{ label: string; value: string; value_en?: string }>
  ) => {
    helpers.setValue(option ? option.value : "");
    setTimeout(() => {
      helpers.setTouched(true, true);
    }, 0);
    if (onChange) {
      onChange(option, actionMeta);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTimeout(() => {
      helpers.setTouched(true, true);
    }, 0);
  };

  return (
    <div className={cn("relative w-full mb-4", className)}>
      {label && (
        <label
          htmlFor={name}
          className={`absolute ${
            selectedLanguage === "ar" ? "right-[12px]" : "left-[12px]"
          } text-primary-5 transition-all duration-200 placeholder-primary-5 z-10
            ${
              isFocused || field.value
                ? "text-[10px] top-[5px] bg-white px-1 text-primary-5/70"
                : "lg:text-base md:text-sm text-sm top-3"
            }
          `}
        >
          {label}
        </label>
      )}

      <Select
        className={cn(
          "w-full",
          meta.touched && meta.error
            ? "border-red-500"
            : "border-[#29246D1A]/10"
        )}
        options={options}
        value={options.find((option) => option.value === field.value) || null}
        onChange={handleChange}
        onInputChange={(newValue) => {
          if (onInputChange) {
            onInputChange(newValue);
          }
        }}
        onMenuScrollToBottom={(e) => {
          const event = e as unknown as React.UIEvent<HTMLDivElement>;
          if (onMenuScrollToBottom) {
            onMenuScrollToBottom(event);
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        isClearable={isClearable}
        isDisabled={disabled}
        isLoading={isLoading}
        loadingMessage={() => t("COMMON.LOADING") || "Loading..."}
        noOptionsMessage={() => (isLoading ? t("COMMON.LOADING") || "Loading..." : t("COMMON.NO_DATA") || "No options")}
        placeholder=""
        name={name}
        components={{ DropdownIndicator, LoadingMessage, NoOptionsMessage }}
        styles={{
          control: (base) => ({
            ...base,
            borderRadius: "1rem",
            border: `1px solid ${
              meta.touched && meta.error ? "#ef4444" : "rgba(41, 36, 109, 0.1)"
            }`,
            backgroundColor: "rgba(41, 36, 109, 0.03)",
            height: "48px",
            paddingLeft: "0.75rem",
            paddingRight: "0.75rem",
            boxShadow: "none",
            "&:hover": {
              border: `1px solid ${
                meta.touched && meta.error
                  ? "#ef4444"
                  : "rgba(41, 36, 109, 0.1)"
              }`,
            },
            minHeight: "48px",
          }),
          valueContainer: (base) => ({
            ...base,
            padding: "0",
            height: "100%",
          }),
          singleValue: (base) => ({
            ...base,
            color: isModal ? "#535151" : "#29246D",
          }),
          placeholder: (base) => ({
            ...base,
            color: isModal ? "#535151" : "#29246D",
          }),
          menu: (base) => ({
            ...base,
            zIndex: 9999,
          }),
        }}
        isSearchable={isSearchable}
      />

      {meta.touched && meta.error && (
        <div className="text-red-500 text-sm mt-1">{meta.error}</div>
      )}
    </div>
  );
};

export default SelectInput;
export { SelectInput };
