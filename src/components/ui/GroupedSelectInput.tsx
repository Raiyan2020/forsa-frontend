"use client";

import { useState } from "react";
import { useField } from "formik";
import Select, { ActionMeta, SingleValue, components } from "react-select";

import { cn } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

// Define option types for flat and grouped options
interface Option {
  label: string;
  value: string;
  value_en?: string;
}

interface GroupedOption {
  label: string;
  options: Option[];
}

interface GroupedSelectInputProps {
  name: string;
  label: string;
  options: (Option | GroupedOption)[];
  placeholder?: string;
  className?: string;
  isClearable?: boolean;
  disabled?: boolean;
  isModal?: boolean;
  onChange?: (
    option: SingleValue<Option>,
    actionMeta: ActionMeta<Option>
  ) => void;
  onInputChange?: (value: any) => void;
  onMenuScrollToBottom?: (e: React.UIEvent<HTMLDivElement>) => void;
  isSearchable?: boolean;
}

// Custom DropdownIndicator to match SelectInput
const DropdownIndicator = (props: any) => (
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

const GroupedSelectInput: React.FC<GroupedSelectInputProps> = ({
  name,
  label,
  options,
  disabled = false,
  isClearable = false,
  isModal = false,
  className = "",
  onChange,
  onInputChange,
  onMenuScrollToBottom,
  isSearchable = false,
}) => {
  const [field, meta, helpers] = useField(name);
  const [isFocused, setIsFocused] = useState(false);
  const selectedLanguage = useLanguageStore((s) => s.language);

  const handleChange = (
    option: SingleValue<Option>,
    actionMeta: ActionMeta<Option>
  ) => {
    helpers.setValue(option ? option.value : "");
    setTimeout(() => {
      helpers.setTouched(true, true);
    }, 0);
    onChange?.(option, actionMeta);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTimeout(() => {
      helpers.setTouched(true, true);
    }, 0);
  };

  // Find the selected option with defensive checks
  const selectedOption =
    options
      .filter((item): item is Option | GroupedOption => !!item)
      .flatMap((item) =>
        "options" in item && Array.isArray(item.options) ? item.options : [item]
      )
      .find(
        (option): option is Option =>
          "value" in option && option.value === field.value
      ) || null;

  return (
    <div className={cn("relative w-full mb-4", className)}>
      {label && (
        <label
          htmlFor={name}
          className={`absolute ${
            selectedLanguage === "ar" ? "right-[12px]" : "left-[12px]"
          } text-primary-5 transition-all duration-200 placeholder-primary-5
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
          "w-full current-status",
          meta.touched && meta.error ? "border-red-500" : "border-[#29246D1A]/10"
        )}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        onInputChange={(newValue) => onInputChange?.(newValue)}
        onMenuScrollToBottom={(e) =>
          onMenuScrollToBottom?.(e as unknown as React.UIEvent<HTMLDivElement>)
        }
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        isClearable={isClearable}
        isDisabled={disabled}
        placeholder=""
        name={name}
        instanceId={name}
        components={{ DropdownIndicator }}
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
                meta.touched && meta.error ? "#ef4444" : "rgba(41, 36, 109, 0.1)"
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

export default GroupedSelectInput;
