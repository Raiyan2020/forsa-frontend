"use client";

import { useState, useRef, forwardRef, useEffect } from "react";
import DatePicker from "react-multi-date-picker";
import { format, parseISO } from "date-fns";
import { useField, useFormikContext } from "formik";
import { DateObject } from "react-multi-date-picker";
import i18n from "@/lib/i18n/config";
import { useLanguageStore } from "@/store/languageStore";
import { cn } from "@/lib/helpers";

interface DatePickerProps {
  name: string;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  rmdpClassname?: string;
  disabled?: boolean;
  showDueDate?: boolean;
}

interface FormValues {
  [key: string]: string;
}

const BirthDateField = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      name,
      label,
      minDate,
      maxDate,
      rmdpClassname = "",
      disabled = false,
      showDueDate = false,
      ...props
    },
    ref
  ) => {
    const { setFieldValue, values, validateField } =
      useFormikContext<FormValues>();
    const [field, meta, helpers] = useField(name);
    const [isFocused, setIsFocused] = useState(false);
    const [displayValue, setDisplayValue] = useState<string>("");
    const datePickerRef = useRef<{
      openCalendar: () => void;
      closeCalendar: () => void;
    }>(null);
    const selectedLanguage = useLanguageStore((s) => s.language);
    const isRtl = selectedLanguage === "ar";

    const formatDateInput = (input: string): string => {
      const digitsOnly = input.replace(/\D/g, "");
      if (!digitsOnly) return "";

      if (digitsOnly.length <= 2) {
        return digitsOnly;
      } else if (digitsOnly.length <= 4) {
        return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2)}`;
      } else {
        return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(
          2,
          4
        )}-${digitsOnly.slice(4, 8)}`;
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const formattedInput = formatDateInput(input);
      setDisplayValue(formattedInput);

      // The custom input owns its displayed text, so react-multi-date-picker
      // does not emit `null` when the user clears it with the keyboard. Keep
      // Formik in sync explicitly; otherwise the previous date remains in the
      // submitted filters and the form never becomes dirty.
      if (!formattedInput) {
        setFieldValue(name, "");
        helpers.setTouched(true);
        setTimeout(() => {
          validateField(name);
        }, 0);
        return;
      }

      if (/^\d{2}-\d{2}-\d{4}$/.test(formattedInput)) {
        try {
          const [day, month, year] = formattedInput.split("-").map(Number);
          const date = new Date(year, month - 1, day);
          if (
            date.getDate() === day &&
            date.getMonth() === month - 1 &&
            date.getFullYear() === year
          ) {
            const formattedDate =
              name === "dob" ? format(date, "yyyy-MM-dd") : date.toISOString();
            setFieldValue(name, formattedDate);
            helpers.setTouched(true);
            setTimeout(() => {
              validateField(name);
            }, 0);
          }
        } catch (e) {
          // Invalid date
        }
      }
    };

    useEffect(() => {
      if (values[name]) {
        try {
          const date = parseISO(values[name]);
          setDisplayValue(format(date, "dd-MM-yyyy"));
        } catch (e) {
          setDisplayValue("");
        }
      } else {
        setDisplayValue("");
      }
    }, [values[name]]);

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
      helpers.setTouched(true);
    };

    const handleIconClick = (): void => {
      datePickerRef.current?.openCalendar();
    };

    const handleChange = (
      date: Date | DateObject | DateObject[] | null,
      manualInput?: boolean
    ): void => {
      if (date === null) {
        setFieldValue(name, "");
        helpers.setTouched(true);
        validateField(name);
        return;
      }

      const singleDate = Array.isArray(date) ? date[0] : date;

      if (singleDate) {
        const parsedDate =
          singleDate instanceof Date ? singleDate : singleDate.toDate();
        const formattedDate =
          name === "dob"
            ? format(parsedDate, "yyyy-MM-dd")
            : parsedDate.toISOString();
        setFieldValue(name, formattedDate);
        helpers.setTouched(true);
        setTimeout(() => {
          validateField(name);
        }, 0);
      }

      if (!manualInput) {
        datePickerRef.current?.closeCalendar();
        handleBlur();
      }
    };

    return (
      <div
        className={cn("relative w-full mb-4", rmdpClassname)}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {label && (
          <label
            htmlFor={name}
            className={`absolute transition-all duration-200 text-primary-5 z-10
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
            <span className="lg:text-xs md:text-[10px] ">
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
          <DatePicker
            {...field}
            {...props}
            id={name}
            value={values[name] ? parseISO(values[name]) : ""}
            format="DD-MM-YYYY"
            onChange={(date: Date | DateObject | DateObject[] | null) =>
              handleChange(date, true)
            }
            onOpen={handleFocus}
            onClose={handleBlur}
            minDate={minDate}
            maxDate={maxDate}
            portal
            zIndex={9999}
            calendarPosition="bottom-center"
            disabled={disabled}
            containerClassName="w-full !h-full"
            inputClass={cn(
              "w-full p-3 pl-[19px] border rounded-2xl h-[48px] bg-[#29246D]/[0.03] text-primary-5 focus:outline-none",
              isRtl ? "text-right pr-3" : "text-left pl-[19px] ",
              meta.touched && meta.error
                ? "border-red-500"
                : "border-[#29246D1A]/10",
              isFocused || field.value ? "pt-6" : "pt-3",
              rmdpClassname
            )}
            ref={datePickerRef}
            onOpenPickNewDate={false}
            inputMode="numeric"
            render={(_value, _openCalendar) => (
              <input
                type="text"
                value={displayValue}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onClick={() => {
                  handleFocus();
                }}
                disabled={disabled}
                className={cn(
                  "w-full p-3 pl-[19px] border rounded-2xl h-[48px] bg-[#29246D]/[0.03] text-primary-5 focus:outline-none",
                  isRtl ? "text-right pr-3" : "text-left pl-[19px] ",
                  meta.touched && meta.error
                    ? "border-red-500"
                    : "border-[#29246D1A]/10",
                  isFocused || displayValue ? "pt-6" : "pt-3",
                  rmdpClassname
                )}
                placeholder={isFocused || displayValue ? "" : undefined}
              />
            )}
          />

          <button
            type="button"
            onClick={handleIconClick}
            className="absolute text-primary-5 z-10"
            style={{
              left: isRtl ? "10px" : "auto",
              right: isRtl ? "auto" : "10px",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {showDueDate ? (
              <img src="/assets/homepage/duedate.svg" alt="due date" />
            ) : (
              <img src="/assets/homepage/dateicon.svg" alt="date" />
            )}
          </button>
        </div>

        {meta.touched && meta.error && (
          <div className="text-red-500 text-sm mt-1">{meta.error}</div>
        )}
      </div>
    );
  }
);

BirthDateField.displayName = "BirthDateField";

export default BirthDateField;
