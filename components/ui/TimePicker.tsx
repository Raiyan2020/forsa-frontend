"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useField } from "formik";

import { cn } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

interface TimePickerProps {
  name: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  autoSetTime?: boolean;
}

const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  ({
    name,
    label,
    className = "",
    disabled = false,
    autoSetTime = false,
    ...props
  }) => {
    const [field, meta, helpers] = useField(name);
    const [isFocused, setIsFocused] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isManualInput, setIsManualInput] = useState(false);
    const [selectedHour, setSelectedHour] = useState(12);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">("PM");
    const [inputValue, setInputValue] = useState("");

    const selectedLanguage = useLanguageStore((s) => s.language);
    const isRtl = selectedLanguage === "ar";
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const visibleInputRef = useRef<HTMLInputElement>(null);

    // Repeat the base lists so the columns scroll "infinitely"
    const baseHours = Array.from({ length: 12 }, (_, i) => i + 1);
    const hours = Array.from({ length: 50 }, () => baseHours).flat();
    const baseMinutes = Array.from({ length: 60 }, (_, i) => i);
    const minutes = Array.from({ length: 50 }, () => baseMinutes).flat();

    // Refs for scrolling to selected items
    const hoursScrollRef = useRef<HTMLDivElement>(null);
    const minutesScrollRef = useRef<HTMLDivElement>(null);
    const periodScrollRef = useRef<HTMLDivElement>(null);

    // State to track if we're programmatically scrolling
    const [isScrolling, setIsScrolling] = useState(false);

    // Track whether focus came from a click on this component
    const [wasExplicitlyFocused, setWasExplicitlyFocused] = useState(false);

    // Parse time string to components
    const parseTimeString = (timeString: string) => {
      if (!timeString) return null;

      try {
        const [h, m] = timeString.split(":").map(Number);
        if (isNaN(h) || isNaN(m)) return null;
        return {
          hour: h === 0 ? 12 : h > 12 ? h - 12 : h,
          minute: m,
          period: (h >= 12 ? "PM" : "AM") as "AM" | "PM",
        };
      } catch {
        return null;
      }
    };

    // Always pad both parts for display consistency
    const formatTimeForDisplay = (hour: number, minute: number): string =>
      `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;

    // Parse existing time value on mount / when the field changes
    useEffect(() => {
      if (field.value && !isManualInput) {
        const time = parseTimeString(field.value);
        if (time) {
          setSelectedHour(time.hour);
          setSelectedMinute(time.minute);
          setSelectedPeriod(time.period);
          // Only update inputValue if we're not in manual input mode
          setInputValue(formatTimeForDisplay(time.hour, time.minute));
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [field.value, isManualInput]);

    // Convert 12-hour to 24-hour format for Formik
    const convertTo24Hour = (
      hour: number,
      minute: number,
      period: "AM" | "PM"
    ): string => {
      let hour24 = hour;
      if (period === "AM" && hour === 12) {
        hour24 = 0;
      } else if (period === "PM" && hour !== 12) {
        hour24 = hour + 12;
      }
      return `${hour24.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
    };

    // Handle time selection from dropdown
    const handleTimeChange = (
      hour: number,
      minute: number,
      period: "AM" | "PM"
    ) => {
      // Normalize back into 1-12 / 0-59 for the repeated scroll lists
      const normalizedHour = ((hour - 1) % 12) + 1;
      const normalizedMinute = minute % 60;

      setSelectedHour(normalizedHour);
      setSelectedMinute(normalizedMinute);
      setSelectedPeriod(period);
      setInputValue(formatTimeForDisplay(normalizedHour, normalizedMinute));

      helpers.setValue(
        convertTo24Hour(normalizedHour, normalizedMinute, period)
      );
    };

    // Handle dropdown toggle - only used for clock icon click
    const handleDropdownToggle = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent the event from bubbling up
      if (disabled) return;

      setIsManualInput(false);
      setWasExplicitlyFocused(true);

      if (autoSetTime && !field.value) {
        handleTimeChange(12, 0, "PM");
      }

      setIsDropdownOpen(!isDropdownOpen);
      setIsFocused(true);
    };

    // Enable manual input mode when clicking the input area
    const handleInputAreaClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;

      setIsDropdownOpen(false);
      setIsManualInput(true);
      setIsFocused(true);
      setWasExplicitlyFocused(true);

      if (autoSetTime && !field.value) {
        handleTimeChange(12, 0, "PM");
      }

      visibleInputRef.current?.focus();
    };

    /** Push a hh:mm pair into local + Formik state when it is a valid time. */
    const commitTypedTime = (hours: string, mins: string) => {
      if (!hours || !mins) return;
      const hour = parseInt(hours, 10);
      const minute = parseInt(mins, 10);

      if (
        isNaN(hour) ||
        isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
      ) {
        return;
      }

      setSelectedHour(hour === 0 ? 12 : hour > 12 ? hour - 12 : hour);
      setSelectedMinute(minute);
      setSelectedPeriod(hour >= 12 ? "PM" : "AM");
      helpers.setValue(
        `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`
      );
    };

    // Handle manual input, preserving exactly what is typed
    const handleManualInputChange = (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const value = e.target.value;

      // Allow digits and colon only
      if (!/^[\d:]*$/.test(value)) return;

      if (value.includes(":")) {
        const parts = value.split(":");
        if (parts.length === 2) {
          const hours = parts[0].slice(0, 2);
          const mins = parts[1].slice(0, 2);
          // Preserve exactly what the user typed — don't reformat mid-entry
          setInputValue(`${hours}:${mins}`);
          commitTypedTime(hours, mins);
        }
        return;
      }

      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length <= 2) {
        setInputValue(digitsOnly);
      } else {
        const hours = digitsOnly.slice(0, 2);
        const mins = digitsOnly.slice(2, 4);
        setInputValue(`${hours}:${mins}`);
        commitTypedTime(hours, mins);
      }
    };

    // Handle blur of manual input
    const handleManualInputBlur = (e: React.FocusEvent) => {
      // Ignore blurs caused by clicking elsewhere inside this component
      if (dropdownRef.current?.contains(e.relatedTarget as Node)) return;

      setIsFocused(false);
      setIsManualInput(false);
      helpers.setTouched(true);
      setWasExplicitlyFocused(false);

      // Only pad once the input is complete
      if (inputValue.includes(":")) {
        const [hours, mins] = inputValue.split(":");
        if (hours?.length === 2 && mins?.length === 2) {
          const hour = parseInt(hours, 10);
          const minute = parseInt(mins, 10);
          if (
            !isNaN(hour) &&
            !isNaN(minute) &&
            hour >= 0 &&
            hour <= 23 &&
            minute >= 0 &&
            minute <= 59
          ) {
            setInputValue(
              `${hour.toString().padStart(2, "0")}:${minute
                .toString()
                .padStart(2, "0")}`
            );
          }
        }
      }
    };

    // Scroll to selected item in dropdown
    useEffect(() => {
      if (!isDropdownOpen) return;

      const timer = setTimeout(() => {
        // Land in the middle repetition so scrolling has room both ways
        if (hoursScrollRef.current) {
          const index = 25 * baseHours.length + (selectedHour - 1);
          const el = hoursScrollRef.current.children[index] as HTMLElement;
          if (el) {
            hoursScrollRef.current.scrollTop =
              el.offsetTop -
              hoursScrollRef.current.clientHeight / 2 +
              el.clientHeight / 2;
          }
        }

        if (minutesScrollRef.current) {
          const baseMinuteIndex = baseMinutes.indexOf(selectedMinute);
          if (baseMinuteIndex !== -1) {
            const index = 25 * baseMinutes.length + baseMinuteIndex;
            const el = minutesScrollRef.current.children[index] as HTMLElement;
            if (el) {
              minutesScrollRef.current.scrollTop =
                el.offsetTop -
                minutesScrollRef.current.clientHeight / 2 +
                el.clientHeight / 2;
            }
          }
        }

        if (periodScrollRef.current) {
          const periodIndex = ["AM", "PM"].indexOf(selectedPeriod);
          if (periodIndex !== -1) {
            const el = periodScrollRef.current.children[
              periodIndex
            ] as HTMLElement;
            if (el) {
              periodScrollRef.current.scrollTop =
                el.offsetTop -
                periodScrollRef.current.clientHeight / 2 +
                el.clientHeight / 2;
            }
          }
        }
      }, 50);

      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDropdownOpen, selectedHour, selectedMinute, selectedPeriod]);

    /** Jump back to the middle repetition when a column nears either end. */
    const handleLoopingScroll = (
      e: React.UIEvent<HTMLDivElement>,
      totalItems: number,
      baseLength: number
    ) => {
      if (isScrolling) return;

      const scrollContainer = e.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const itemHeight = scrollHeight / totalItems;
      const singleLoopHeight = itemHeight * baseLength;

      if (scrollTop < singleLoopHeight) {
        setIsScrolling(true);
        scrollContainer.scrollTop = scrollTop + singleLoopHeight * 20;
        setTimeout(() => setIsScrolling(false), 50);
      } else if (scrollTop > scrollHeight - clientHeight - singleLoopHeight) {
        setIsScrolling(true);
        scrollContainer.scrollTop = scrollTop - singleLoopHeight * 20;
        setTimeout(() => setIsScrolling(false), 50);
      }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsDropdownOpen(false);

          if (wasExplicitlyFocused) {
            setIsFocused(false);
            setIsManualInput(false);
            helpers.setTouched(true);
            setWasExplicitlyFocused(false);
          }
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wasExplicitlyFocused]);

    // Display value for the non-input mode
    const parsed = field.value ? parseTimeString(field.value) : null;
    const displayValue = parsed
      ? formatTimeForDisplay(parsed.hour, parsed.minute)
      : "";

    const boxClassName = cn(
      "w-full p-3 border rounded-2xl h-[48px] bg-[#29246D]/[0.03] text-primary-5",
      isRtl ? "text-right pr-3" : "text-left pl-[19px]",
      meta.touched && meta.error ? "border-red-500" : "border-[#29246D1A]/10",
      isFocused || field.value ? "pt-6" : "pt-3",
      disabled ? "opacity-50 cursor-not-allowed" : "",
      className
    );

    return (
      <div
        className={cn("relative w-full mb-4", className)}
        dir={isRtl ? "rtl" : "ltr"}
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling
      >
        {/* Floating Label */}
        {label && (
          <label
            htmlFor={name}
            className={`absolute transition-all duration-200 text-primary-5 pointer-events-none
              ${isRtl ? "right-[9px]" : "left-[15px]"}
              ${
                isFocused || field.value
                  ? "text-[10px] top-[5px] bg-white px-1 text-primary-5/70"
                  : "lg:text-base md:text-sm text-sm top-3"
              }
            `}
          >
            {label}
          </label>
        )}

        <div
          className={`relative flex items-center ${
            isRtl ? "flex-row-reverse" : ""
          }`}
        >
          {!isManualInput ? (
            /* Display box - visible when not in manual input mode */
            <div
              className={cn(boxClassName, "cursor-pointer flex items-center")}
              onClick={handleInputAreaClick}
            >
              <span
                className={displayValue ? "text-primary-5" : "text-transparent"}
              >
                {displayValue || "00:00"}
              </span>
            </div>
          ) : (
            /* Manual input field */
            <input
              ref={visibleInputRef}
              type="text"
              value={inputValue}
              onChange={handleManualInputChange}
              onFocus={() => setWasExplicitlyFocused(true)}
              onBlur={handleManualInputBlur}
              placeholder="00:00"
              className={cn(boxClassName, "outline-none")}
              disabled={disabled}
              dir={isRtl ? "rtl" : "ltr"}
              maxLength={5}
            />
          )}

          {/* Custom Clock Icon */}
          <button
            type="button"
            onClick={handleDropdownToggle}
            disabled={disabled}
            className="absolute text-primary-5"
            style={{
              left: isRtl ? "10px" : "auto",
              right: isRtl ? "auto" : "10px",
            }}
          >
            <Image
              src="/assets/profile/clockicn.svg"
              alt="clock icon"
              width={20}
              height={20}
            />
          </button>
        </div>

        {/* Custom Dropdown */}
        {isDropdownOpen && (
          <div
            dir="ltr"
            className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden w-48 left-0"
          >
            <style>{`
              .timepicker-scroll::-webkit-scrollbar { display: none; }
              .timepicker-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <div className="flex">
              {/* Hours Column */}
              <div className="flex-1 border-r border-gray-200">
                <div
                  ref={hoursScrollRef}
                  className="max-h-48 overflow-y-auto timepicker-scroll"
                  onScroll={(e) =>
                    handleLoopingScroll(e, hours.length, baseHours.length)
                  }
                >
                  {hours.map((hour, index) => (
                    <div
                      key={`hour-${index}`}
                      className={`py-2 px-4 text-center cursor-pointer hover:bg-gray-100 ${
                        hour === selectedHour ? "bg-blue-100 font-bold" : ""
                      }`}
                      onClick={() =>
                        handleTimeChange(hour, selectedMinute, selectedPeriod)
                      }
                    >
                      {hour.toString().padStart(2, "0")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Minutes Column */}
              <div className="flex-1 border-r border-gray-200">
                <div
                  ref={minutesScrollRef}
                  className="max-h-48 overflow-y-auto timepicker-scroll"
                  onScroll={(e) =>
                    handleLoopingScroll(e, minutes.length, baseMinutes.length)
                  }
                >
                  {minutes.map((minute, index) => (
                    <div
                      key={`minute-${index}`}
                      className={`py-2 px-4 text-center cursor-pointer hover:bg-gray-100 ${
                        minute === selectedMinute ? "bg-blue-100 font-bold" : ""
                      }`}
                      onClick={() =>
                        handleTimeChange(selectedHour, minute, selectedPeriod)
                      }
                    >
                      {minute.toString().padStart(2, "0")}
                    </div>
                  ))}
                </div>
              </div>

              {/* AM/PM Column */}
              <div className="flex-1">
                <div
                  ref={periodScrollRef}
                  className="max-h-48 overflow-y-auto timepicker-scroll"
                >
                  {(["AM", "PM"] as const).map((period) => (
                    <div
                      key={period}
                      className={`py-2 px-4 text-center cursor-pointer hover:bg-gray-100 ${
                        period === selectedPeriod ? "bg-blue-100 font-bold" : ""
                      }`}
                      onClick={() =>
                        handleTimeChange(selectedHour, selectedMinute, period)
                      }
                    >
                      {period}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hidden input for form compatibility and validation */}
        <input
          {...field}
          {...props}
          ref={inputRef}
          type="time"
          name={name}
          value={field.value || ""}
          onChange={(e) => {
            helpers.setValue(e.target.value);
            helpers.setTouched(true);
          }}
          onBlur={() => {
            if (wasExplicitlyFocused) {
              helpers.setTouched(true);
              setIsFocused(false);
            }
          }}
          style={{
            position: "absolute",
            left: "-9999px",
            opacity: 0,
            pointerEvents: "none",
          }}
          tabIndex={-1}
        />

        {/* Error Message */}
        {meta.touched && meta.error && (
          <div className="text-red-500 text-sm mt-1">{meta.error}</div>
        )}
      </div>
    );
  }
);

TimePicker.displayName = "TimePicker";

export default TimePicker;
