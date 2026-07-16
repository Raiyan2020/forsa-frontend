"use client";

import React, { useState, useRef, useEffect, forwardRef } from "react";
import { useField } from "formik";
import { useLanguageStore } from "@/store/languageStore";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";

interface AgeRangeProps {
  name: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  isModal?: boolean;
}

const AgeRange = forwardRef<HTMLDivElement, AgeRangeProps>(
  ({ name, label, className = "", disabled = false, isModal = false }, ref) => {
    const [field, meta, helpers] = useField(name);
    const [isFocusedStart, setIsFocusedStart] = useState(false);
    const [isFocusedEnd, setIsFocusedEnd] = useState(false);

    const initialValue = Array.isArray(field.value) ? field.value : [null, null];
    const [startAge, setStartAge] = useState<number | null>(initialValue[0]);
    const [endAge, setEndAge] = useState<number | null>(initialValue[1]);

    const [isEndAgeValid, setIsEndAgeValid] = useState(true);
    const selectedLanguage = useLanguageStore((s) => s.language);
    const isRtl = selectedLanguage === "ar";
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { t } = useTranslation();

    const updatingFromFieldRef = useRef(false);
    const updatingFromStateRef = useRef(false);

    const hasStartError = meta.touched && meta.error && startAge === null;
    const hasEndError = meta.touched && !isEndAgeValid;

    const validateAges = (newStart: number | null, newEnd: number | null) => {
      if (newEnd === null) {
        setIsEndAgeValid(true);
      } else {
        setIsEndAgeValid(newStart !== null ? newStart <= newEnd : true);
      }
    };

    useEffect(() => {
      if (updatingFromStateRef.current) {
        updatingFromStateRef.current = false;
        return;
      }

      if (field.value && Array.isArray(field.value)) {
        updatingFromFieldRef.current = true;
        const [newStart, newEnd] = field.value;

        if (newStart !== startAge) {
          setStartAge(newStart);
        }

        if (newEnd !== endAge) {
          setEndAge(newEnd);
        }

        validateAges(newStart, newEnd);
        updatingFromFieldRef.current = false;
      }
    }, [field.value]);

    const updateFormValue = (newStart: number | null, newEnd: number | null) => {
      if (updatingFromFieldRef.current) return;

      updatingFromStateRef.current = true;
      helpers.setValue([newStart, newEnd]);
      validateAges(newStart, newEnd);
    };

    useEffect(() => {
      const style = document.createElement("style");
      style.textContent = `
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        input::placeholder {
          color: #6B7280;
        }
      `;
      document.head.appendChild(style);
      return () => style.remove();
    }, []);

    const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value)) {
        setStartAge(value);
        updateFormValue(value, endAge);
      } else {
        setStartAge(null);
        updateFormValue(null, endAge);
      }
    };

    const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value)) {
        setEndAge(value);
        updateFormValue(startAge, value);
      } else {
        setEndAge(null);
        updateFormValue(startAge, null);
      }
    };

    const handleStartInputBlur = () => {
      setIsFocusedStart(false);
      helpers.setTouched(true);
      if (startAge !== null) {
        const value = Math.min(Math.max(startAge, 1), 100);
        setStartAge(value);
        updateFormValue(value, endAge);
      }
    };

    const handleEndInputBlur = () => {
      setIsFocusedEnd(false);
      if (endAge !== null) {
        const value = Math.min(Math.max(endAge, 1), 100);
        setEndAge(value);
        updateFormValue(startAge, value);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (["ArrowUp", "ArrowDown", "e", "E"].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleStartInputFocus = () => {
      setIsFocusedStart(true);
    };

    const handleEndInputFocus = () => {
      setIsFocusedEnd(true);
    };

    return (
      <div
        className={clsx("relative w-full mb-4", className)}
        ref={ref || containerRef}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex gap-2 w-full">
          {/* Start Age Field */}
          <div className="relative flex-1">
            {label && (
              <label
                htmlFor={`${name}-start`}
                className={clsx(
                  "absolute transition-all duration-200 text-primary-5 z-10",
                  isRtl ? "right-[9px]" : "left-[15px]",
                  isFocusedStart || startAge !== null
                    ? "text-[10px] top-[5px] px-1 text-primary-5/70"
                    : "lg:text-base md:text-sm text-sm top-3"
                )}
              >
                {t("COMMON.FROM")} {label}
              </label>
            )}
            <div
              className={clsx(
                "w-full p-3 border rounded-2xl h-[48px] flex items-center modal-border",
                isRtl ? "pr-3" : "pl-[19px]",
                isModal ? "" : "bg-[#29246D]/[0.03]",
                hasStartError ? "border-red-500" : "border-[#29246D1A]/10",
                isFocusedStart || startAge !== null ? "pt-6" : "pt-3"
              )}
            >
              <input
                id={`${name}-start`}
                type="number"
                value={startAge ?? ""}
                placeholder=""
                onChange={handleStartInputChange}
                onBlur={handleStartInputBlur}
                onFocus={handleStartInputFocus}
                onKeyDown={handleKeyDown}
                min="1"
                max="100"
                disabled={disabled}
                className={clsx(
                  isModal ? "no-border" : "",
                  "w-full bg-transparent text-primary-5 text-base outline-none appearance-none",
                  isRtl ? "text-right" : "text-left"
                )}
              />
            </div>
          </div>

          {/* End Age Field */}
          <div className="relative flex-1">
            {label && (
              <label
                htmlFor={`${name}-end`}
                className={clsx(
                  "absolute transition-all duration-200 text-primary-5 z-10",
                  isRtl ? "right-[9px]" : "left-[15px]",
                  isFocusedEnd || endAge !== null
                    ? "text-[10px] top-[5px] px-1 text-primary-5/70"
                    : "lg:text-base md:text-sm text-sm top-3"
                )}
              >
                {t("COMMON.TO")} {label}
              </label>
            )}
            <div
              className={clsx(
                "w-full p-3 border rounded-2xl h-[48px] flex items-center modal-border",
                isRtl ? "pr-3" : "pl-[19px]",
                isModal ? "" : "bg-[#29246D]/[0.03]",
                hasEndError ? "border-red-500" : "border-[#29246D1A]/10",
                isFocusedEnd || endAge !== null ? "pt-6" : "pt-3"
              )}
            >
              <input
                id={`${name}-end`}
                type="number"
                value={endAge ?? ""}
                placeholder=""
                onChange={handleEndInputChange}
                onBlur={handleEndInputBlur}
                onFocus={handleEndInputFocus}
                onKeyDown={handleKeyDown}
                min="1"
                max="100"
                disabled={disabled}
                className={clsx(
                  isModal ? "no-border" : "",
                  "w-full bg-transparent text-primary-5 text-base outline-none appearance-none",
                  isRtl ? "text-right" : "text-left"
                )}
              />
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {meta.touched && meta.error && (
          <div className="text-red-500 text-xs mt-1">{meta.error}</div>
        )}
        {meta.touched && !meta.error && !isEndAgeValid && (
          <div className="text-red-500 text-xs mt-1">
            {t("COMMON.END_AGE_MUST_BE_GREATER_THAN_START_AGE")}
          </div>
        )}
      </div>
    );
  }
);

AgeRange.displayName = "AgeRange";

export default AgeRange;
