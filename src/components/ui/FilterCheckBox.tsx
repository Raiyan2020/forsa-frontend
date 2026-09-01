"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

interface CheckboxProps {
  id: string;
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export default function FilterCheckBox({
  id,
  label,
  checked = false,
  onChange,
  className = "",
}: CheckboxProps) {
  const [isChecked, setIsChecked] = useState(checked);

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handleChange = () => {
    const newChecked = !isChecked;
    setIsChecked(newChecked);
    if (onChange) {
      onChange(newChecked);
    }
  };

  const selectedLanguage = useLanguageStore((s) => s.language);
  const isRtl = selectedLanguage === "ar";

  return (
    <div
      className={`flex items-center gap-2 ${className} cursor-pointer`}
      onClick={handleChange}
    >
      <div
        className={`h-5 w-5 flex items-center justify-center border rounded cursor-pointer 
          ${isChecked ? "bg-primary-5 border-primary-5" : "border-gray-300"}
        `}
      >
        {isChecked && (
          <svg
            className="w-4 h-4 text-white font-bold"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      <label
        htmlFor={id}
        className={cn(
          "text-primary-5 cursor-pointer",
          isRtl
            ? "mr-2 ml-0 text-secondary-102"
            : "ml-2 text-secondary-102 lg:text-lg md:text-sm"
        )}
      >
        {label}
      </label>
    </div>
  );
}
