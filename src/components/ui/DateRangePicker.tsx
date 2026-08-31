"use client";

import React, { useEffect, useRef, useState } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

interface DateRangePickerProps {
  selectedDate: string;
  startDate: string;
  endDate: string;
  onDateChange: (date: string) => void;
  placeholder?: string;
}

/**
 * Single-date picker constrained to an opportunity's window. Named "range"
 * because the *selectable* span is a range — the value itself is one day.
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  selectedDate,
  startDate,
  endDate,
  onDateChange,
  placeholder,
}) => {
  const { t } = useTranslation();
  const [displayValue, setDisplayValue] = useState<string>("");
  const [internalValue, setInternalValue] = useState<Date | null>(null);
  // Bumped on every pick so the picker re-mounts and re-selecting the same
  // day still registers.
  const [forceRenderKey, setForceRenderKey] = useState<number>(0);
  const datePickerRef = useRef<{
    openCalendar: () => void;
    closeCalendar: () => void;
  }>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedDate) {
      setDisplayValue("");
      setInternalValue(null);
      return;
    }
    try {
      const date = parseISO(selectedDate);
      if (!isNaN(date.getTime())) {
        setDisplayValue(format(date, "dd-MM-yyyy"));
        setInternalValue(date);
      }
    } catch (error) {
      console.error("Error parsing date:", error);
      setDisplayValue("");
      setInternalValue(null);
    }
  }, [selectedDate]);

  const commitDate = (jsDate: Date) => {
    const normalizedDate = new Date(jsDate);
    normalizedDate.setHours(0, 0, 0, 0);

    setInternalValue(normalizedDate);
    setDisplayValue(format(normalizedDate, "dd-MM-yyyy"));
    onDateChange(normalizedDate.toISOString());
    setForceRenderKey((prev) => prev + 1);
    datePickerRef.current?.closeCalendar();
  };

  const handleDateSelect = (
    date: Date | DateObject | DateObject[] | null
  ) => {
    if (!date) return;
    const singleDate = Array.isArray(date) ? date[0] : date;
    if (!singleDate) return;
    commitDate(singleDate instanceof Date ? singleDate : singleDate.toDate());
  };

  const mapDays = ({ date }: { date: DateObject }) => {
    const thisDate = date.toDate();
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    thisDate.setHours(0, 0, 0, 0);
    startDateObj.setHours(0, 0, 0, 0);
    endDateObj.setHours(0, 0, 0, 0);

    if (thisDate < startDateObj || thisDate > endDateObj) {
      return { disabled: true };
    }

    return { onClick: () => commitDate(thisDate) };
  };

  return (
    <div className="relative" ref={containerRef}>
      <DatePicker
        value={internalValue}
        onChange={handleDateSelect}
        minDate={new Date(startDate)}
        maxDate={new Date(endDate)}
        format="DD-MM-YYYY"
        mapDays={mapDays}
        onlyShowInRangeDates={false}
        ref={datePickerRef}
        key={`${selectedDate}-${forceRenderKey}`}
        render={(_value: unknown, openCalendar: () => void) => (
          <div className="searchitms flex items-center bg-white border border-primary-5/20 rounded-full px-4 py-2 md:h-[50px] h-[50px] laptopmain:h-[50px] mobilescreen:h-[60px] xss:rounded-[20px] w-[687px] 2xl:w-[687px] laptopmain:w-[580px] 2xl:h-[55px] lg:w-[450px] md:w-[350px] mobilescreen:w-full cursor-pointer">
            <img
              src="/assets/profile/searchicn.svg"
              alt=""
              className="lg:w-auto md:w-5"
            />
            <input
              type="text"
              value={displayValue}
              onClick={openCalendar}
              placeholder={placeholder || t("COMMON.DATES")}
              className="flex-1 outline-none bg-transparent px-2 2xl:text-[25px] lg:text-lg xss:text-base laptopmain:text-xl lg:w-auto md:w-[150px] w-[150px] placeholder:text-[#181822]/80 cursor-pointer"
              readOnly
            />
            <button
              type="button"
              onClick={openCalendar}
              className="cursor-pointer p-1"
            >
              <img
                src="/assets/homepage/dateicon.svg"
                alt=""
                className="lg:w-auto md:w-5"
              />
            </button>
          </div>
        )}
      />
    </div>
  );
};

export default DateRangePicker;
