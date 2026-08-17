"use client";

import { useField } from "formik";
import { useState, useCallback, forwardRef, ReactNode } from "react";
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
  /**
   * Strip everything but digits as the visitor types, and honour `maxLength`
   * while doing it. `type="number"` cannot do this — it ignores `maxLength`
   * entirely and still accepts `e`, `.` and pasted junk.
   */
  digitsOnly?: boolean;
  /**
   * Strip everything but letters and spaces as the visitor types (covers paste
   * and autofill too). Use for name fields that must not contain digits.
   */
  lettersOnly?: boolean;
  /** Rendered inside the field on the trailing edge — a status spinner, say. */
  endAdornment?: ReactNode;
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
      digitsOnly = false,
      lettersOnly = false,
      endAdornment,
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

    /**
     * Sanitize on the event itself, before handing it on: `e.target` is the
     * input element, so rewriting `.value` here is what both Formik and the
     * rendered field end up seeing. This also covers paste and autofill, which
     * a keydown guard never catches.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (digitsOnly) {
        const digits = e.target.value.replace(/\D/g, "");
        e.target.value =
          typeof props.maxLength === "number"
            ? digits.slice(0, props.maxLength)
            : digits;
      } else if (lettersOnly) {
        e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, "");
      }
      // A caller-supplied onChange replaces Formik's, exactly as it did when
      // `{...props}` was spread over `{...field}`.
      (props.onChange ?? field.onChange)(e);
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
              endAdornment && "pr-10 rtl:pr-3 rtl:pl-10",
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
            onChange={handleChange}
            aria-describedby={
              meta.touched && meta.error && !hideError
                ? `${name}-error`
                : undefined
            }
            maxLength={props.maxLength}
          />

          {endAdornment && (
            <div className="absolute inset-y-0 right-[12px] rtl:right-auto rtl:left-[12px] flex items-center pointer-events-none">
              {endAdornment}
            </div>
          )}

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
