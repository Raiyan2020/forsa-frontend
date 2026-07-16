"use client";

import { useField } from "formik";
import { useCallback, forwardRef, useState } from "react";
import { cn } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";
import { FaEyeSlash } from "react-icons/fa";
import { LuEye } from "react-icons/lu";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  hideError?: boolean;
  customClass?: string;
  className?: string;
  type?: "text" | "password" | "email" | "number" | "tel";
}

const ModalInput = forwardRef<HTMLInputElement, InputProps>(
  (
    { customClass, name, type = "text", className = "", hideError = false, ...props },
    ref
  ) => {
    const [field, meta, helpers] = useField(name);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const selectedLanguage = useLanguageStore((s) => s.language);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (type === "password" && e.target.value === "***********") {
          e.target.value = "";
        }
      },
      [type]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (type === "password" && e.target.value === "") {
          e.target.value = "***********";
        }
        helpers.setTouched(true);
      },
      [type, helpers]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const invalidKeys = ["e", "E", "+", "-"];
      if (type === "number" && invalidKeys.includes(e.key)) {
        e.preventDefault();
      }
    };

    const togglePasswordVisibility = useCallback(() => {
      setIsPasswordVisible((prev) => !prev);
    }, []);

    return (
      <div className={cn("relative w-full mb-4", customClass)}>
        <div className="relative">
          <input
            {...field}
            {...props}
            ref={ref}
            id={name}
            type={
              type === "number"
                ? "number"
                : type === "password" && !isPasswordVisible
                ? "password"
                : type === "text" || isPasswordVisible
                ? "text"
                : type
            }
            className={cn(
              "w-full p-3 pl-[19px] border rounded-2xl h-[48px] bg-[#fff] placeholder-black focus:outline-none lg:text-base md:text-sm text-sm",
              meta.touched && meta.error
                ? "border-red-500"
                : "border-[#CBCBCB]",
              selectedLanguage === "ar" ? "text-right" : "text-left",
              className
            )}
            autoComplete={type === "email" ? "off" : "new-password"}
            dir={selectedLanguage === "ar" ? "rtl" : "ltr"}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          {type === "password" && (
            <button
              type="button"
              className="absolute inset-y-0 right-[9px] rtl:right-auto rtl:left-[15px] flex items-center"
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
          <div className="text-red-500 text-sm mt-1">{meta.error}</div>
        )}
      </div>
    );
  }
);

ModalInput.displayName = "ModalInput";

export default ModalInput;
