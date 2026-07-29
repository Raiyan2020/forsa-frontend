"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Image from "next/image";
import DatePicker, { DateObject } from "react-multi-date-picker";
import { format, parseISO } from "date-fns";
import { useField, useFormikContext } from "formik";

import i18n from "@/lib/i18n/config";
import { cn } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/${path}`;

interface DatePickerProps {
  name: string;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  rmdpClassname?: string;
  disabled?: boolean;
  showDueDate?: boolean;
  enforceStartDate?: Date;
}

interface FormValues {
  [key: string]: string;
}

const DatePickerInput = forwardRef<HTMLInputElement, DatePickerProps>(
  ({
    name,
    label,
    minDate,
    maxDate,
    rmdpClassname = "",
    disabled = false,
    showDueDate = false,
    enforceStartDate,
    ...props
  }) => {
    const { setFieldValue, values, validateField } =
      useFormikContext<FormValues>();
    const [field, meta, helpers] = useField(name);
    const [isFocused, setIsFocused] = useState(false);
    const [effectiveMinDate, setEffectiveMinDate] = useState<Date | undefined>(
      minDate
    );
    const [displayValue, setDisplayValue] = useState("");
    const datePickerRef = useRef<{
      openCalendar: () => void;
      closeCalendar: () => void;
    }>(null);
    const selectedLanguage = useLanguageStore((s) => s.language);
    const isRtl = selectedLanguage === "ar";

    const fieldValue = values[name];

    // Update effectiveMinDate when the field value changes
    useEffect(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (fieldValue) {
        const existingDate = parseISO(fieldValue);
        existingDate.setHours(0, 0, 0, 0);
        // If the existing date is before today, allow only that date (for display)
        setEffectiveMinDate(existingDate < today ? existingDate : today);
      } else {
        setEffectiveMinDate(today);
      }
    }, [fieldValue]);

    // Format date as user types (DD-MM-YYYY)
    const formatDateInput = (input: string): string => {
      const digitsOnly = input.replace(/\D/g, "");
      if (!digitsOnly) return "";

      if (digitsOnly.length <= 2) {
        return digitsOnly; // Just day (1-31)
      }
      if (digitsOnly.length <= 4) {
        return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2)}`; // Day and month
      }
      return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(
        2,
        4
      )}-${digitsOnly.slice(4, 8)}`;
    };

    // Handle manual input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formattedInput = formatDateInput(e.target.value);
      setDisplayValue(formattedInput);

      // If we have a complete date (DD-MM-YYYY)
      if (/^\d{2}-\d{2}-\d{4}$/.test(formattedInput)) {
        const [day, month, year] = formattedInput.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        // Reject rollovers like 31-02-2025
        if (
          date.getDate() === day &&
          date.getMonth() === month - 1 &&
          date.getFullYear() === year
        ) {
          setFieldValue(
            name,
            name === "dob" ? format(date, "yyyy-MM-dd") : date.toISOString()
          );
          helpers.setTouched(true);
          setTimeout(() => validateField(name), 0);
        }
      }
    };

    // Sync display value with the actual value
    useEffect(() => {
      if (!fieldValue) {
        setDisplayValue("");
        return;
      }
      try {
        const date = parseISO(fieldValue);
        setDisplayValue(isNaN(date.getTime()) ? "" : format(date, "dd-MM-yyyy"));
      } catch {
        setDisplayValue("");
      }
    }, [fieldValue]);

    const handleFocus = () => setIsFocused(true);

    const handleBlur = () => {
      setIsFocused(false);
      helpers.setTouched(true); // Mark as touched on blur
      setTimeout(() => validateField(name), 0);
    };

    const handleIconClick = () => datePickerRef.current?.openCalendar();

    const handleChange = (
      date: Date | DateObject | DateObject[] | null,
      manualInput?: boolean
    ): void => {
      if (date === null) {
        setFieldValue(name, "");
        setDisplayValue("");
        helpers.setTouched(true);
        validateField(name); // Trigger validation after clearing
        return;
      }

      const singleDate = Array.isArray(date) ? date[0] : date;

      if (singleDate) {
        const parsedDate =
          singleDate instanceof Date ? singleDate : singleDate.toDate();
        setFieldValue(
          name,
          name === "dob"
            ? format(parsedDate, "yyyy-MM-dd")
            : parsedDate.toISOString()
        );
        setDisplayValue(format(parsedDate, "dd-MM-yyyy"));
        helpers.setTouched(true); // Mark as touched after value change
        setTimeout(() => validateField(name), 0);
      }

      if (!manualInput) {
        datePickerRef.current?.closeCalendar();
        handleBlur();
      }
    };

    // Helper for disabling days
    const mapDays = ({ date }: { date: DateObject }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let selectedDate: Date | null = null;
      if (fieldValue) {
        try {
          selectedDate = parseISO(fieldValue);
          selectedDate.setHours(0, 0, 0, 0);
        } catch {
          selectedDate = null;
        }
      }
      const thisDate = date.toDate();
      thisDate.setHours(0, 0, 0, 0);

      // If enforceStartDate is provided, use it instead of today for minimum date
      const effectiveStartDate = enforceStartDate || today;
      effectiveStartDate.setHours(0, 0, 0, 0);

      if (selectedDate && selectedDate < effectiveStartDate) {
        // Only enable the already-selected past date, disable all other past dates
        if (
          thisDate < effectiveStartDate &&
          thisDate.getTime() !== selectedDate.getTime()
        ) {
          return { disabled: true };
        }
      } else if (enforceStartDate && thisDate < effectiveStartDate) {
        return { disabled: true };
      } else if (!enforceStartDate && thisDate < today) {
        return { disabled: true };
      }
      return {};
    };

    const inputClassName = cn(
      "w-full p-3 border rounded-2xl h-[48px] bg-[#29246D]/[0.03] text-primary-5 focus:outline-none",
      isRtl ? "text-right pr-3" : "text-left pl-[19px]",
      meta.touched && meta.error ? "border-red-500" : "border-[#29246D1A]/10",
      isFocused || displayValue ? "pt-6" : "pt-3",
      rmdpClassname
    );

    return (
      <div
        className={cn("relative w-full mb-4", rmdpClassname)}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Floating Label */}
        {label && (
          <label
            htmlFor={name}
            className={`absolute transition-all duration-200 text-primary-5
              ${isRtl ? "right-[9px]" : "left-[15px]"}
              ${
                isFocused || displayValue
                  ? "text-[10px] top-[5px] bg-white px-1 text-primary-5/70"
                  : "lg:text-base md:text-sm text-sm top-3"
              }
            `}
            onClick={handleIconClick}
          >
            {`${label} (`}
            <span className="lg:text-xs md:text-[10px]">
              {i18n.t("COMMON.DATE_FORMAT")}
            </span>
            {`)`}
          </label>
        )}

        <div
          className={`relative flex items-center ${
            isRtl ? "flex-row-reverse" : ""
          }`}
        >
          {/* Date Picker Input */}
          <DatePicker
            {...field}
            {...props}
            id={name}
            value={fieldValue ? parseISO(fieldValue) : null}
            format="DD-MM-YYYY"
            onChange={(date: Date | DateObject | DateObject[] | null) =>
              handleChange(date, true)
            }
            onOpen={handleFocus}
            onClose={handleBlur}
            minDate={effectiveMinDate}
            maxDate={maxDate}
            calendarPosition="bottom-center"
            disabled={disabled}
            containerClassName="w-full !h-full"
            inputClass={inputClassName}
            ref={datePickerRef}
            onOpenPickNewDate={false}
            mapDays={mapDays}
            inputMode="numeric"
            render={(_value: any, openCalendar: () => void) => (
              <input
                type="text"
                value={displayValue}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onClick={openCalendar}
                disabled={disabled}
                className={cn(
                  inputClassName,
                  disabled ? "cursor-not-allowed bg-opacity-70" : ""
                )}
                placeholder={isFocused || displayValue ? "" : undefined}
              />
            )}
          />

          {/* Custom Calendar Icon */}
          <button
            type="button"
            onClick={disabled ? undefined : handleIconClick}
            className={cn(
              "absolute text-primary-5",
              disabled && "cursor-not-allowed opacity-50"
            )}
            style={{
              left: isRtl ? "10px" : "auto",
              right: isRtl ? "auto" : "10px",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {showDueDate ? (
              <>
                <Image
                  src={asset("homepage/duedate.svg")}
                  alt=""
                  width={20}
                  height={20}
                  className={disabled ? "opacity-50" : ""}
                />
                {disabled && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-0.5 w-full bg-gray-400 rotate-45 rounded-full" />
                  </div>
                )}
              </>
            ) : (
              <Image
                src={asset("homepage/dateicon.svg")}
                alt=""
                width={20}
                height={20}
              />
            )}
          </button>
        </div>

        {/* Error Message */}
        {meta.touched && meta.error && (
          <div className="text-red-500 text-sm mt-1">{meta.error}</div>
        )}
      </div>
    );
  }
);

DatePickerInput.displayName = "DatePickerInput";

export default DatePickerInput;
