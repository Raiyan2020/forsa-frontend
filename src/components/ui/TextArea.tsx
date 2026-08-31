"use client";

import { useField } from "formik";
import { useState, forwardRef } from "react";
import { cn } from "@/lib/helpers";

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label?: string;
  hideError?: boolean;
  customClass?: string;
  className?: string;
  rows?: number;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      customClass,
      name,
      className = "",
      label,
      hideError = false,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [field, meta, helpers] = useField(name);

    return (
      <div className={cn("relative w-full mb-3", customClass)}>
        {label && (
          <label
            htmlFor={name}
            className={cn(
              "absolute left-[15px] text-primary-5 transition-all duration-200 placeholder-primary-5 z-10",
              isFocused || field.value
                ? "text-[10px] top-[2px] bg-white px-1"
                : "lg:text-base md:text-sm text-sm top-[12px]"
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <textarea
            {...field}
            {...props}
            ref={ref}
            id={name}
            rows={rows}
            className={cn(
              "w-full pl-[19px] border rounded-2xl bg-[#29246D]/[0.03] p-3 placeholder-primary-5 focus:outline-none resize-none txt-area",
              meta.touched && meta.error
                ? "border-red-500"
                : "border-[#29246D1A]/10",
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              helpers.setTouched(true);
            }}
          />
        </div>

        {!hideError && meta.touched && meta.error && (
          <div className="text-red-500 text-sm mt-1">{meta.error}</div>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;
