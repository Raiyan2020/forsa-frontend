"use client";

import { useField } from "formik";
import { forwardRef } from "react";
import { cn } from "@/lib/helpers";

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  hideError?: boolean;
  customClass?: string;
  className?: string;
  rows?: number;
}

const ModalTextarea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      customClass,
      name,
      className = "",
      hideError = false,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const [field, meta] = useField(name);

    return (
      <div className={cn("relative w-full mb-3", customClass)}>
        <div className="relative">
          <textarea
            {...field}
            {...props}
            ref={ref}
            id={name}
            rows={rows}
            className={cn(
              "w-full border rounded-2xl bg-[#fff] p-3 focus:outline-none resize-none lg:text-base md:text-sm text-sm",
              meta.touched && meta.error
                ? "border-red-500"
                : "border-[#CBCBCB]",
              className
            )}
          />
        </div>

        {!hideError && meta.touched && meta.error && (
          <div className="text-red-500 text-sm mt-1">{meta.error}</div>
        )}
      </div>
    );
  }
);

ModalTextarea.displayName = "ModalTextarea";

export default ModalTextarea;
