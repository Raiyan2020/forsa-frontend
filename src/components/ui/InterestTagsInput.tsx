"use client";

import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useLanguageStore } from "@/store/languageStore";

interface InterestTagsInputProps {
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
}

export const InterestTagsInput = ({
  name,
  label,
  setFieldValue,
  setFieldTouched,
  values,
  errors,
  touched,
  notTransparent = false,
}: InterestTagsInputProps) => {
  const [currentInterest, setCurrentInterest] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const selectedLanguage = useLanguageStore((s) => s.language);

  const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentInterest.trim()) {
      e.preventDefault();
      addInterest(currentInterest.trim());
    }
  };

  const addInterest = (interest: string) => {
    const newInterests = [...(values || []), interest];
    setFieldValue(name, newInterests, false);
    setCurrentInterest("");
    setTimeout(() => {
      setFieldTouched(name, true, true);
    }, 0);
  };

  const handleBlur = () => {
    if (currentInterest.trim()) {
      addInterest(currentInterest.trim());
    }
    setIsFocused(false);
    setFieldTouched(name, true, true);
  };

  const removeInterest = (index: number) => {
    const newInterests = (values || []).filter((_, i) => i !== index);
    setFieldValue(name, newInterests, true);
    if (newInterests.length === 0) {
      setTimeout(() => {
        setFieldTouched(name, true, true);
      }, 0);
    }
  };

  const dirClass = selectedLanguage === "ar" ? "right-[13px]" : "left-[13px]";
  const textClass = selectedLanguage === "ar" ? "text-right" : "text-left";

  return (
    <div className="relative w-full mb-4">
      {label && (
        <label
          htmlFor={name}
          className={`absolute ${dirClass} text-primary-5 transition-all duration-200 placeholder-primary-5 
                        ${
                          isFocused || (values && values.length > 0)
                            ? "text-[10px] top-[7px] px-1 bg-white"
                            : "lg:text-base md:text-sm text-sm top-[14px]"
                        }
                    `}
        >
          {label}
        </label>
      )}
      <div
        className={`flex flex-wrap gap-2 px-3 pb-3 pt-5 border rounded-2xl min-h-[48px]
                    ${
                      notTransparent
                        ? "bg-white"
                        : "bg-[#29246D]/[0.03]"
                    }
                    ${
                      touched && errors
                        ? "border-red-500"
                        : "border-[#29246D1A]/10"
                    }`}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      >
        {values &&
          values.length > 0 &&
          values.map((interest, index) => (
            <div
              key={index}
              className="flex items-center bg-primary-5 text-white text-sm font-medium px-2 pt-[0.1px] pb-[0.5px] rounded-full"
            >
              <span>{interest}</span>
              <button
                type="button"
                onClick={() => removeInterest(index)}
                className="ml-1 text-white/70 hover:text-white"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        <input
          type="text"
          value={currentInterest}
          onChange={(e) => setCurrentInterest(e.target.value)}
          onKeyDown={handleInterestKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder=""
          className={`flex-1 outline-none border-none bg-transparent text-sm text-primary-5 placeholder-gray-400 ${textClass}`}
        />
      </div>
      {touched && errors && (
        <div className={`text-red-500 text-sm mt-1 ${textClass}`}>{errors}</div>
      )}
    </div>
  );
};
