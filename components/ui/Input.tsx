"use client";

import { useField } from "formik";
import { useState, useCallback, forwardRef } from "react";
import { FaEyeSlash } from "react-icons/fa";
import { LuEye } from "react-icons/lu";
import { cn } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label?: string;
  hideError?: boolean;
  customClass?: string;
  className?: string;
  type?: "text" | "password" | "email" | "number" | "tel";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      customClass,
      name,
      type = "text",
      className = "",
      label,
      hideError = false,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const togglePasswordVisibility = useCallback(() => {
      setIsPasswordVisible((prev) => !prev);
    }, []);

    const [field, meta, helpers] = useField(name);
    const selectedLanguage = useLanguageStore((s) => s.language);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const invalidKeys = ["e", "E", "+", "-"];
      if (type === "number" && invalidKeys.includes(e.key)) {
        e.preventDefault();
      }
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    return (
      <div className={cn("relative w-full mb-4", customClass)}>
        {label && (
          <label
            htmlFor={name}
            className={cn(
              "absolute left-[15px] rtl:right-[9px] text-primary-5 transition-all duration-200 bg-transparent z-10",
              isFocused || field.value
                ? "text-[10px] top-[5px] px-1 text-primary-5/70"
                : "lg:text-base md:text-sm text-sm top-3"
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            {...field}
            {...props}
            ref={ref}
            type={
              type === "number"
                ? "number"
                : type === "password" && !isPasswordVisible
                  ? "password"
                  : type === "text" || isPasswordVisible
                    ? "text"
                    : type
            }
            id={name}
            className={cn(
              "w-full p-3 pl-[19px] border rounded-2xl h-[48px] bg-[#29246D]/[0.03] placeholder-black focus:outline-none",
              label ? "pt-6" : "pt-3",
              meta.touched && meta.error
                ? "border-red-500"
                : "border-[#29246D1A]/10",
              selectedLanguage === "ar" ? "text-right" : "text-left",
              className
            )}
            autoComplete={
              type === "email"
                ? "username"
                : type === "password"
                  ? "new-password"
                  : "off"
            }
            dir={props.dir || (selectedLanguage === "ar" ? "rtl" : "ltr")}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              helpers.setTouched(true);
            }}
            onKeyDown={handleKeyDown}
            aria-describedby={
              meta.touched && meta.error && !hideError
                ? `${name}-error`
                : undefined
            }
            maxLength={props.maxLength}
          />

          {type === "password" && (
            <button
              type="button"
              className="absolute inset-y-0 right-[9px] rtl:right-auto rtl:left-[15px] flex items-center z-10"
              onClick={togglePasswordVisibility}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              aria-pressed={isPasswordVisible}
            >
              {isPasswordVisible ? (
                <FaEyeSlash />
              ) : (
                <LuEye className="w-6 h-6 text-primary-5" />
              )}
            </button>
          )}
        </div>

        {!hideError && meta.touched && meta.error && (
          <div id={`${name}-error`} className="text-red-500 text-sm mt-1">
            {meta.error}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
export { Input };
