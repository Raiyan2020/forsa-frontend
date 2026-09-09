"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Calendar as BigCalendar,
  DateLocalizer,
  momentLocalizer,
  View as RBCView,
} from "react-big-calendar";
import moment, { Moment } from "moment";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import "react-big-calendar/lib/css/react-big-calendar.css";

import { Modal } from "@/components/ui/Modal";
import { getCalendar } from "@/features/calendar/services/calendarApi";
import { useLanguageStore } from "@/store/languageStore";
import CalendarStyles from "./CalendarStyles";

const asset = (path: string) => `/assets/${path}`;

// Set up the localizer for moment
const localizer: DateLocalizer = momentLocalizer(moment);

interface EventResource {
  color: string;
  desc: string;
  type: string;
  detailPath: string;
  status?: string;
  id: string;
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: EventResource;
}

interface DayWithEvent {
  date: string;
  color: string;
}

interface MiniCalendarDate {
  day: number | null;
  date: string | null;
  isCurrentMonth: boolean;
  isToday?: boolean;
  events?: DayWithEvent[];
}

interface Task {
  title: string;
  time: string;
  category: string;
  date?: string;
}

type CustomView = "day" | "week" | "month" | "year";

/** Detail route for an entry, keyed on the API's English type label. */
const DETAIL_PATH_BY_TYPE: Record<string, string> = {
  Opportunity: "/volunteer-event-detail",
  "Class/Workshop": "/learn-share-event-detail",
  Internship: "/learn-share-event-detail",
  Course: "/learn-share-event-detail",
  Consultation: "/learn-share-event-detail",
  "Exhibition and Carnivals": "/event-details",
  Camps: "/event-details",
  Hub: "/event-details",
  "Sports Activities": "/event-details",
};

const LEARN_SERVE_TYPES = [
  "Class/Workshop",
  "Internship",
  "Course",
  "Consultation",
];
const EVENT_TYPES = [
  "Exhibition and Carnivals",
  "Camps",
  "Hub",
  "Sports Activities",
];

const GENERIC_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  Volunteer: { en: "Volunteer opportunity", ar: "فرصة تطوعية" },
  Learn: { en: "Learn and serve", ar: "تعلّم وخدمة" },
  Event: { en: "Event", ar: "فعالية" },
};

const detailPathForType = (type: string) => {
  if (type === "Volunteer") return "/volunteer-event-detail";
  if (type === "Learn") return "/learn-share-event-detail";
  if (type === "Event") return "/event-details";
  return DETAIL_PATH_BY_TYPE[type];
};

export default function Calendar() {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const isRTL = selectedLanguage === "ar";
  const router = useRouter();
  const { t } = useTranslation();
  const todayDate = useMemo(() => new Date(), []);

  const [view, setView] = useState<CustomView>("week");
  const [currentDate, setCurrentDate] = useState<Date>(todayDate);
  const [miniCalendarDate, setMiniCalendarDate] = useState<Date>(todayDate);
  const [miniCalendarDates, setMiniCalendarDates] = useState<
    MiniCalendarDate[]
  >([]);
  // Ref for the calendar container so week view can scroll to today
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Calculate range bounds for the query
  const monthStart = moment(miniCalendarDate).startOf("month").toDate();
  const monthEnd = moment(miniCalendarDate).endOf("month").toDate();
  const weekStart = moment(miniCalendarDate).startOf("week").toDate();
  const weekEnd = moment(miniCalendarDate).endOf("week").toDate();
  const dayStart = moment(miniCalendarDate).startOf("day").toDate();
  const dayEnd = moment(miniCalendarDate).endOf("day").toDate();

  // Map view to time_range for the query
  const timeRange = view === "year" ? "year" : view;

  const [showEventModal, setShowEventModal] = useState(false);
  const [modalEvents, setModalEvents] = useState<CalendarEvent[]>([]);
  const [modalDate, setModalDate] = useState<Date | null>(null);

  const rangeStart =
    timeRange === "year"
      ? undefined
      : moment(
          timeRange === "week"
            ? weekStart
            : timeRange === "month"
              ? monthStart
              : dayStart
        ).format("YYYY-MM-DD");

  const rangeEnd =
    timeRange === "year"
      ? undefined
      : moment(
          timeRange === "week"
            ? weekEnd
            : timeRange === "month"
              ? monthEnd
              : dayEnd
        ).format("YYYY-MM-DD");

  // Fetch calendar events with time_range param
  const { data, isLoading } = useQuery({
    queryKey: ["my-calendar", timeRange, debouncedSearch, rangeStart, rangeEnd],
    queryFn: () =>
      getCalendar({
        time_range: timeRange,
        search: debouncedSearch || undefined,
        start_date: rangeStart,
        end_date: rangeEnd,
      }),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Scroll to today's date in week view when component loads or view changes
  useEffect(() => {
    const scrollToToday = () => {
      if (view !== "week" || !calendarContainerRef.current) return;

      // Get today's day of week (0 = Sunday, 6 = Saturday)
      const todayDayOfWeek = new Date().getDay();

      // Find all day columns in the calendar
      const dayColumns = calendarContainerRef.current.querySelectorAll(
        ".rbc-day-slot, .rbc-header"
      );

      // If we have columns and today is in the current week view
      if (dayColumns.length > 0 && todayDayOfWeek < dayColumns.length) {
        const todayColumn = dayColumns[todayDayOfWeek];
        if (!todayColumn) return;

        // Calculate the scroll position that centers today's column
        const containerWidth = calendarContainerRef.current.clientWidth;
        const columnLeft = todayColumn.getBoundingClientRect().left;
        const columnWidth = todayColumn.clientWidth;
        const containerScrollLeft = calendarContainerRef.current.scrollLeft;

        calendarContainerRef.current.scrollTo({
          left:
            containerScrollLeft +
            columnLeft -
            containerWidth / 2 +
            columnWidth / 2,
          behavior: "smooth",
        });
      }
    };

    // Short timeout to ensure the calendar is fully rendered
    const timeoutId = setTimeout(scrollToToday, 300);
    return () => clearTimeout(timeoutId);
  }, [view, currentDate]);

  // Use dynamic events from API
  const events: CalendarEvent[] = useMemo(() => {
    if (!data?.data) return [];

    const mapped: CalendarEvent[] = [];

    const uniqueItems = new Map<string, any>();
    data.data.forEach((event: any) => {
      const apiType = event.type_en || event.type || "";
      const dedupeKey = `${apiType}:${event.id}`;
      if (!uniqueItems.has(dedupeKey)) uniqueItems.set(dedupeKey, event);
    });

    uniqueItems.forEach((event: any) => {
      const apiType = event.type_en || event.type || "";
      let color = "#E0E0E0";
      if (apiType === "Volunteer" || apiType === "Opportunity")
        color = "#4DB6AC";
      if (apiType === "Learn" || LEARN_SERVE_TYPES.includes(apiType))
        color = "#CDDC39";
      if (apiType === "Event" || EVENT_TYPES.includes(apiType))
        color = "#5271FF";
      if (event.opportunity_status?.toLowerCase() === "completed")
        color = "#BDBDBD";

      const title =
        (isRTL ? event.title_ar : event.title_en) ||
        event.title_en ||
        event.title_ar ||
        "";
      const genericLabels = GENERIC_TYPE_LABELS[apiType];
      const displayType = isRTL
        ? event.type_ar || genericLabels?.ar || apiType
        : event.type_en || genericLabels?.en || apiType;
      const detailPath = detailPathForType(apiType);
      if (!detailPath) return;

      const resource: EventResource = {
        color,
        desc: `${t("COMMON.TYPE")}: ${displayType}`,
        type: displayType,
        detailPath,
        status: event.opportunity_status,
        id: event.id,
      };

      const startDate = moment(event.start_date, "YYYY-MM-DD");
      const endDate = moment(event.end_date, "YYYY-MM-DD");

      const hasTimes = Boolean(event.start_time && event.end_time);

      // For day/week view, create an event for each day in the range with the same time
      if (view === "day" || view === "week") {
        const current = startDate.clone();
        while (current.isSameOrBefore(endDate, "day")) {
          mapped.push({
            title,
            start: hasTimes
              ? moment(
                  `${current.format("YYYY-MM-DD")}T${event.start_time}`
                ).toDate()
              : current.clone().startOf("day").toDate(),
            end: hasTimes
              ? moment(
                  `${current.format("YYYY-MM-DD")}T${event.end_time}`
                ).toDate()
              : current.clone().add(1, "day").startOf("day").toDate(),
            allDay: !hasTimes,
            resource,
          });
          current.add(1, "day");
        }
      } else {
        // For month/year view, do not split
        mapped.push({
          title,
          start: hasTimes
            ? moment(`${event.start_date}T${event.start_time}`).toDate()
            : startDate.clone().startOf("day").toDate(),
          end: hasTimes
            ? moment(`${event.end_date}T${event.end_time}`).toDate()
            : endDate.clone().add(1, "day").startOf("day").toDate(),
          allDay: !hasTimes,
          resource,
        });
      }
    });

    return mapped;
  }, [data, isRTL, view, t]);

  // Handle event click for redirection
  const handleSelectEvent = (event: CalendarEvent) => {
    const { detailPath, id } = event.resource;

    if (!id) {
      console.error("Event ID is missing:", event);
      return;
    }

    router.push(`${detailPath}/${id}`);
  };

  // Days with events for the mini-calendar dots
  const daysWithEvents: DayWithEvent[] = useMemo(
    () =>
      events.reduce<DayWithEvent[]>((acc, event) => {
        const date = moment(event.start).format("YYYY-MM-DD");
        if (!acc.some((item) => item.date === date)) {
          acc.push({ date, color: event.resource.color });
        }
        return acc;
      }, []),
    [events]
  );

  // Generate dynamic tasks from events
  const upcomingTasks: Task[] = useMemo(() => {
    const today = moment();

    // Filter events for the next 7 days
    return events
      .filter((event) =>
        moment(event.start).isBetween(
          today,
          today.clone().add(7, "days"),
          "day",
          "[]"
        )
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((event) => {
        const eventDate = moment(event.start);
        let category: string;

        if (eventDate.isSame(today, "day")) {
          category = "TODAY";
        } else if (eventDate.isSame(today.clone().add(1, "day"), "day")) {
          category = "TOMORROW";
        } else {
          category = eventDate.format("dddd").toUpperCase();
        }

        return {
          title: event.title,
          time: `${moment(event.start).format("h:mm A")} - ${moment(
            event.end
          ).format("h:mm A")}`,
          category,
          date: eventDate.format("M/D/YYYY"),
        };
      });
  }, [events]);

  // Group tasks by category
  const groupedTasks: Record<string, Task[]> = useMemo(
    () =>
      upcomingTasks.reduce<Record<string, Task[]>>((acc, task) => {
        if (!acc[task.category]) acc[task.category] = [];
        acc[task.category].push(task);
        return acc;
      }, {}),
    [upcomingTasks]
  );

  // Generate mini calendar dates
  useEffect(() => {
    const date: Moment = moment(miniCalendarDate);
    const month = date.month();
    const year = date.year();

    const firstDay: Moment = moment(new Date(year, month, 1));
    const firstDayOfWeek = firstDay.day();
    const daysInMonth = date.daysInMonth();

    const calendarDays: MiniCalendarDate[] = [];

    // Add empty slots
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push({ day: null, date: null, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate: Moment = moment(new Date(year, month, i));
      calendarDays.push({
        day: i,
        date: dayDate.format("YYYY-MM-DD"),
        isCurrentMonth: true,
        isToday: dayDate.isSame(moment(currentDate), "day"),
        events: daysWithEvents.filter(
          (event) => event.date === dayDate.format("YYYY-MM-DD")
        ),
      });
    }

    // Complete the last week
    const remainingSlots = (7 - (calendarDays.length % 7)) % 7;
    for (let i = 1; i <= remainingSlots; i++) {
      calendarDays.push({
        day: i,
        date: moment(new Date(year, month + 1, i)).format("YYYY-MM-DD"),
        isCurrentMonth: false,
      });
    }

    setMiniCalendarDates(calendarDays);
  }, [miniCalendarDate, currentDate, daysWithEvents]);

  // Mini calendar navigation
  const navigateMiniCalendar = (direction: "prev" | "next") => {
    const date: Moment = moment(miniCalendarDate);
    const newDate =
      direction === "prev"
        ? date.subtract(1, "month").toDate()
        : date.add(1, "month").toDate();

    setMiniCalendarDate(newDate);
    // Move currentDate to the first day of the new month to trigger a fetch
    setCurrentDate(moment(newDate).startOf("month").toDate());
  };

  // Mini calendar day click handler
  const handleMiniCalendarDayClick = (dateObj: MiniCalendarDate) => {
    if (dateObj.date && dateObj.isCurrentMonth) {
      const newDate = moment(dateObj.date).toDate();
      setCurrentDate(newDate);
      setMiniCalendarDate(newDate);
    }
  };

  // Custom event style
  const eventStyleGetter = (
    event: CalendarEvent
  ): { style: React.CSSProperties } => {
    const backgroundColor = event.resource?.color ?? "#3174d7";
    const normalizedBgColor = backgroundColor.toUpperCase();

    let textColor = "#FFFFFF";
    let borderColor = backgroundColor;

    if (normalizedBgColor === "#D9EF61") {
      textColor = "#727272";
      borderColor = "#7E9017";
    } else if (normalizedBgColor === "#E0E0E0") {
      textColor = "#727272";
      borderColor = "#5B5B5B";
    } else if (normalizedBgColor === "#70B4C2") {
      borderColor = "#0A5F71";
    } else if (normalizedBgColor === "#5C6BC0") {
      borderColor = "#303F9F";
    } else if (normalizedBgColor === "#4DB6AC") {
      borderColor = "#00897B";
    } else if (normalizedBgColor === "#CDDC39") {
      textColor = "#827717";
      borderColor = "#9E9D24";
    }

    const baseStyle: React.CSSProperties = {
      backgroundColor,
      borderRadius: "4px",
      opacity: 1,
      color: textColor,
      border: "none",
      display: "flex",
      fontSize: "12px",
      boxSizing: "border-box",
      overflowY: "scroll",
      cursor: "pointer", // Indicate clickable events
      borderLeft: `3px solid ${borderColor}`,
    };

    if (view === "day") {
      return {
        style: {
          ...baseStyle,
          padding: "4px 8px",
          height: "auto",
          minHeight: "40px",
          width: "100%",
        },
      };
    }

    // Default styles for week and month views
    return {
      style: {
        ...baseStyle,
        padding: "8px",
        height: "auto",
        minHeight: "40px",
        width: "calc(100% - 0px)",
        marginLeft: isRTL ? "0" : "-1px",
        marginRight: isRTL ? "3px" : "0",
      },
    };
  };

  // Handle navigation in the big calendar
  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
    setMiniCalendarDate(newDate);
  };

  // Go to today
  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setMiniCalendarDate(now);
  };

  // Custom time slot formatter
  const formats = {
    timeGutterFormat: (date: Date, culture?: string): string =>
      localizer.format(date, "h A", culture),
    dayFormat: (date: Date, culture?: string): string =>
      localizer.format(date, "ddd", culture).toUpperCase(),
    dayHeaderFormat: (date: Date, culture?: string): string =>
      view === "day"
        ? localizer.format(date, "dddd, MMMM D", culture)
        : localizer.format(date, "ddd D", culture),
    dayRangeHeaderFormat: (
      { start, end }: { start: Date; end: Date },
      culture?: string
    ): string =>
      `${localizer.format(start, "MMMM", culture)} ${localizer
        .format(start, "D", culture)
        .padStart(2, "0")} - ${localizer
        .format(end, "D", culture)
        .padStart(2, "0")}, ${localizer.format(start, "YYYY", culture)}`,
    eventTimeRangeFormat: (
      { start, end }: { start: Date; end: Date },
      culture?: string
    ): string =>
      view === "day"
        ? `${localizer.format(start, "h:mm A", culture)} - ${localizer.format(
            end,
            "h:mm A",
            culture
          )}`
        : `${localizer.format(start, "h:mm A", culture)}`,
    selectRangeFormat: (
      { start, end }: { start: Date; end: Date },
      culture?: string
    ): string =>
      `${localizer.format(start, "h:mm A", culture)} - ${localizer.format(
        end,
        "h:mm A",
        culture
      )}`,
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  /** Week view caps each day at 3 events and collapses the rest into a "+N more". */
  const WeekEventWrapper: React.FC<any> = ({ children, event }) => {
    if (view !== "week") return children;

    const slotDate = moment(event.start).startOf("day");
    const eventsForDay = events.filter((e) =>
      moment(e.start).isSame(slotDate, "day")
    );

    const index = eventsForDay.findIndex(
      (e) =>
        e.start.getTime() === event.start.getTime() &&
        e.end.getTime() === event.end.getTime()
    );

    if (index < 3) return children;

    if (index === 3) {
      const remaining = eventsForDay.length - 3;
      return (
        <div
          style={{
            background: "#fff",
            color: "#5271FF",
            borderRadius: "4px",
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: "12px",
            border: "1px solid #5271FF",
            marginTop: "2px",
          }}
          onClick={() => {
            setModalEvents(eventsForDay);
            setModalDate(slotDate.toDate());
            setShowEventModal(true);
          }}
        >
          +{remaining} more
        </div>
      );
    }

    // Hide all events after the 4th
    return null;
  };

  const navUnit =
    timeRange === "year"
      ? "year"
      : timeRange === "month"
        ? "month"
        : timeRange === "week"
          ? "week"
          : "day";

  const viewButtons: Array<{ value: CustomView; en: string; ar: string }> = [
    { value: "day", en: "Day", ar: "يوم" },
    { value: "week", en: "Week", ar: "أسبوع" },
    { value: "month", en: "Month", ar: "شهر" },
    { value: "year", en: "Year", ar: "سنة" },
  ];

  return (
    <>
      <Modal
        open={showEventModal}
        onClose={() => setShowEventModal(false)}
        size="small"
        title={modalDate ? moment(modalDate).format("dddd, MMMM D, YYYY") : ""}
      >
        <div className="rounded-lg" onClick={(e) => e.stopPropagation()}>
          <ul>
            {modalEvents.map((ev, idx) => (
              <li
                key={idx}
                className="mb-2 border-b pb-2 rounded cursor-pointer"
                style={{
                  background: ev.resource?.color || "#E0E0E0",
                  color: "#222",
                  padding: "10px",
                }}
                onClick={() => handleSelectEvent(ev)}
              >
                <div className="font-semibold">{ev.title}</div>
                <div className="text-xs text-gray-700">
                  {moment(ev.start).format("h:mm A")} -{" "}
                  {moment(ev.end).format("h:mm A")}
                </div>
                <div className="text-xs">{ev.resource?.desc}</div>
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      <div className="border-t border-[#000]">
        <div
          className={`2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[85%] lg:w-[90%] laptopitm:w-[90%] w-[90%] mx-auto text-center relative 2xl:py-[70px] laptopmain:py-[50px] py-[40px] flex flex-col ${
            isRTL ? "rtl" : "ltr"
          }`}
        >
          {/* Mobile Sidebar Toggle */}
          <div className="hidden justify-end mb-2">
            <button
              onClick={toggleSidebar}
              className="bg-indigo-900 text-white px-3 py-1 rounded-md text-sm flex items-center"
            >
              <span>
                {sidebarOpen ? "Hide Mini Calendar" : "Show Mini Calendar"}
              </span>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row md:flex-row">
            {/* Sidebar with mini calendar */}
            <div
              className={`${
                sidebarOpen ? "block" : "hidden md:block"
              } w-full md:w-[250px] lg:w-[250px] xl:w-[300px] 2xl:w-[300px] bg-indigo-900 text-white overflow-y-auto flex-shrink-0`}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-[#5271FF]" />
                    <div className="w-3 h-3 rounded-full bg-[#D9EF61]" />
                    <div className="w-3 h-3 rounded-full bg-[#70B4C2]" />
                  </div>
                  {/* <Image
                    src={asset("calander/calnderplus.svg")}
                    alt="Add"
                    width={20}
                    height={20}
                  /> */}
                </div>

                {/* Mini calendar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center text-lg mb-2">
                    <div className="text-xl md:text-2xl">
                      <span className="text-white">
                        {moment(miniCalendarDate).format("MMMM")}
                      </span>{" "}
                      <span className="text-[#D9EF61]">
                        {moment(miniCalendarDate).format("YYYY")}
                      </span>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => navigateMiniCalendar("prev")}
                        className="text-gray-400 hover:text-white"
                      >
                        <Image
                          src={asset(
                            isRTL
                              ? "calander/rightarrow.svg"
                              : "calander/leftarrow.svg"
                          )}
                          alt="Previous"
                          width={16}
                          height={16}
                        />
                      </button>
                      <button
                        onClick={() => navigateMiniCalendar("next")}
                        className="text-gray-400 hover:text-white"
                      >
                        <Image
                          src={asset(
                            isRTL
                              ? "calander/leftarrow.svg"
                              : "calander/rightarrow.svg"
                          )}
                          alt="Next"
                          width={16}
                          height={16}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
                      (day, i) => (
                        <div key={i} className="text-[#71717A] py-1 text-[10px]">
                          {day}
                        </div>
                      )
                    )}
                    {miniCalendarDates.map((dateObj, i) => (
                      <div
                        key={i}
                        className={`relative py-1 flex flex-col items-center ${
                          !dateObj.isCurrentMonth ? "text-gray-600" : ""
                        } ${
                          dateObj.date
                            ? "cursor-pointer hover:bg-indigo-800 rounded"
                            : ""
                        }`}
                        onClick={() => handleMiniCalendarDayClick(dateObj)}
                      >
                        {dateObj.day && (
                          <>
                            <div
                              className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold ${
                                dateObj.isToday ? "bg-[#5271FF] h-7 w-7" : ""
                              }`}
                            >
                              {dateObj.day}
                            </div>
                            {dateObj.events && dateObj.events.length > 0 && (
                              <div className="flex space-x-0.5 mt-1">
                                {dateObj.events.slice(0, 3).map((event, idx) => (
                                  <div
                                    key={idx}
                                    className="w-1 h-1 rounded-full"
                                    style={{ backgroundColor: event.color }}
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tasks */}
                <div>
                  {Object.entries(groupedTasks).map(([category, tasks], idx) => (
                    <div key={idx} className="mb-4">
                      <div
                        className={`text-xs mb-2 font-bold text-[13px] pb-2 ${
                          category === "TODAY" ? "text-[#5271FF]" : "text-white"
                        }`}
                      >
                        {category}
                        {tasks[0].date && (
                          <span className="font-normal"> • {tasks[0].date}</span>
                        )}
                      </div>
                      {tasks.map((task, taskIdx) => (
                        <div key={taskIdx} className="mb-2 text-xs">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-blue-400 mr-2" />
                            <div className="text-[#A1A1AA] font-semibold">
                              {task.time}
                            </div>
                          </div>
                          <div className="ml-5 text-xs">{task.title}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar Area */}
            <div className="flex-1 flex flex-col bg-[#ECECEC] overflow-hidden">
              {/* Top toolbar */}
              <div className="gap-[10px] lg:flex md:flex flex-wrap justify-between items-center p-4 border-b bg-[#ececec] pr-[3%]">
                <div className="flex items-center mb-2 md:mb-0">
                  <button
                    onClick={() =>
                      handleNavigate(
                        moment(currentDate).subtract(1, navUnit).toDate()
                      )
                    }
                    className="pl-2 pr-[1px] text-gray-600"
                  >
                    <Image
                      src={asset(
                        isRTL
                          ? "calander/blackrightarrow.svg"
                          : "calander/blackleftarrow.svg"
                      )}
                      alt="Previous"
                      width={24}
                      height={24}
                    />
                  </button>
                  <button onClick={goToToday}>
                    <Image
                      src={asset("calander/today.svg")}
                      alt="Today"
                      width={60}
                      height={24}
                    />
                  </button>
                  <button
                    onClick={() =>
                      handleNavigate(
                        moment(currentDate).add(1, navUnit).toDate()
                      )
                    }
                    className="pl-[1px] text-gray-600"
                  >
                    <Image
                      src={asset(
                        isRTL
                          ? "calander/blackleftarrow.svg"
                          : "calander/blackrightarrow.svg"
                      )}
                      alt="Next"
                      width={24}
                      height={24}
                    />
                  </button>
                </div>

                <div className="flex space-x-1 mb-2 md:mb-0">
                  {viewButtons.map((btn) => (
                    <button
                      key={btn.value}
                      className={`px-3 py-1 text-sm rounded-md ${
                        view === btn.value
                          ? "bg-primary-5 text-white"
                          : "text-[#71717A]"
                      }`}
                      onClick={() => setView(btn.value)}
                    >
                      {isRTL ? btn.ar : btn.en}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-auto">
                  <input
                    type="text"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={isRTL ? "بحث" : "Search"}
                    className={`px-3 py-2 bg-[#E4E4E4] rounded-md text-sm w-full lg:w-48 md:w-48 ${
                      isRTL ? "pr-8" : "pl-8"
                    }`}
                  />
                  <Image
                    className={`w-4 h-4 absolute top-1/2 transform -translate-y-1/2 text-gray-500 ${
                      isRTL ? "right-2" : "left-2"
                    }`}
                    src={asset("calander/search.svg")}
                    alt="Search"
                    width={16}
                    height={16}
                  />
                </div>
              </div>

              {/* Calendar view area */}
              <div
                className="flex-1 overflow-auto h-[500px] md:h-[600px] lg:h-[700px]"
                ref={calendarContainerRef}
              >
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <span>Loading events...</span>
                  </div>
                ) : view === "year" ? (
                  <YearView
                    date={currentDate}
                    localizer={localizer}
                    events={events}
                    onNavigate={(date) => {
                      // Month headers hand back midnight on the 1st; day cells
                      // hand back the specific day.
                      const isMonthClick =
                        date.getDate() === 1 &&
                        date.getHours() === 0 &&
                        date.getMinutes() === 0 &&
                        date.getSeconds() === 0;

                      handleNavigate(date);
                      setView(isMonthClick ? "month" : "day");
                    }}
                    isRTL={isRTL}
                  />
                ) : (
                  <BigCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: "100%" }}
                    formats={formats}
                    views={{ month: true, week: true, day: true }}
                    view={view as "day" | "week" | "month"}
                    onView={(newView: RBCView) => {
                      // Only set standard views from the Calendar component
                      if (newView !== "agenda") {
                        setView(newView as CustomView);
                      }
                    }}
                    date={currentDate}
                    onNavigate={handleNavigate}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={handleSelectEvent}
                    timeslots={view === "day" || view === "week" ? 2 : 1}
                    step={view === "day" || view === "week" ? 30 : 60}
                    min={moment(currentDate).startOf("day").toDate()}
                    max={moment(currentDate).endOf("day").toDate()}
                    rtl={isRTL}
                    culture={isRTL ? "ar" : "en"}
                    className="custom-calendar"
                    components={{
                      toolbar: () => null,
                      event: EventComponent as any,
                      timeGutterHeader: () => null,
                      eventWrapper: WeekEventWrapper,
                      week: { header: CustomHeaderCell as any },
                      month: {
                        dateHeader: (props: any) => (
                          <CustomMonthHeader {...props} isRTL={isRTL} />
                        ),
                      },
                      day: { header: CustomDayHeader as any },
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <CalendarStyles />
        </div>
      </div>
    </>
  );
}

// Custom event component
const EventComponent: React.FC<{ event: CalendarEvent; title: string }> = ({
  event,
  title,
}) => (
  <div className="h-full overflow-hidden">
    <div className="font-semibold text-xs">{title || event.title}</div>
    {event.resource?.desc && (
      <div className="text-xs opacity-80 pb-[5px]">{event.resource.desc}</div>
    )}
  </div>
);

// Custom header cell component for Week view
const CustomHeaderCell: React.FC<{
  date: Date;
  localizer: DateLocalizer;
}> = ({ date, localizer: loc }) => {
  const isToday = moment(date).isSame(moment(), "day");

  return (
    <div className={`custom-header-cell ${isToday ? "bg-blue-50" : "bg-white"}`}>
      <div className="custom-header-cell-day">
        {loc.format(date, "ddd").toUpperCase()}
      </div>
      <div className="custom-header-cell-date">{loc.format(date, "D")}</div>
    </div>
  );
};

// Custom header cell component for Month view
interface CustomMonthHeaderProps {
  date: Date;
  label: string;
  isRTL?: boolean;
}

const CustomMonthHeader: React.FC<CustomMonthHeaderProps> = ({
  date,
  label,
}) => {
  const isToday = moment(date).isSame(moment(), "day");

  return (
    <div className={`flex justify-center ${isToday ? "bg-blue-50" : ""}`}>
      <span className="rounded-full flex items-center justify-center w-7 h-7 font-semibold text-sm">
        {label}
      </span>
    </div>
  );
};

// Custom header cell component for Day view
const CustomDayHeader: React.FC<{
  date: Date;
  localizer: DateLocalizer;
}> = ({ date, localizer: loc }) => {
  const isToday = moment(date).isSame(moment(), "day");

  return (
    <div
      className={`custom-day-header p-3 ${isToday ? "bg-blue-50" : "bg-white"}`}
    >
      <div className="text-lg font-bold">{loc.format(date, "dddd")}</div>
      <div className="text-md text-gray-500">
        {loc.format(date, "MMMM D, YYYY")}
      </div>
    </div>
  );
};

// Custom Year View component to mimic Google Calendar
interface YearViewProps {
  date: Date;
  localizer: DateLocalizer;
  events: CalendarEvent[];
  onNavigate: (date: Date) => void;
  isRTL: boolean;
}

interface YearViewDay {
  day: number | null;
  date: string | null;
  isToday?: boolean;
  events?: CalendarEvent[];
}

const YearView: React.FC<YearViewProps> = ({
  date,
  localizer: loc,
  events,
  onNavigate,
  isRTL,
}) => {
  const currentYear = moment(date).year();
  const months = Array.from({ length: 12 }, (_, i) =>
    moment().year(currentYear).month(i)
  );

  // Function to generate the days for each month
  const generateMonthDays = (month: Moment): YearViewDay[] => {
    const daysInMonth = month.daysInMonth();
    const startOfMonth = month.clone().startOf("month");
    const firstDayOfWeek = startOfMonth.day(); // 0 for Sunday

    const days: YearViewDay[] = [];
    // Add empty placeholders for days before the 1st of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, date: null, events: [] });
    }

    // Add the actual days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayMoment = month.clone().date(i);
      const dateStr = dayMoment.format("YYYY-MM-DD");

      // Events starting, ending, or spanning this date
      const dayEvents = events.filter((event) => {
        const eventStartDate = moment(event.start).format("YYYY-MM-DD");
        const eventEndDate = moment(event.end).format("YYYY-MM-DD");
        return (
          eventStartDate === dateStr ||
          eventEndDate === dateStr ||
          moment(dateStr).isBetween(eventStartDate, eventEndDate, null, "[]")
        );
      });

      days.push({
        day: i,
        date: dateStr,
        isToday: dayMoment.isSame(moment(), "day"),
        events: dayEvents.length > 0 ? dayEvents.slice(0, 4) : [],
      });
    }

    return days;
  };

  // Handle month click to navigate to month view
  const handleMonthClick = (month: Moment) => {
    onNavigate(month.clone().startOf("month").toDate());
  };

  return (
    <div className={`year-view p-4 ${isRTL ? "rtl" : "ltr"}`}>
      <h2 className="text-2xl font-semibold text-center mb-6">{currentYear}</h2>

      <div className="grid grid-cols-3 gap-6 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2">
        {months.map((month, index) => (
          <div
            key={index}
            className="month-container border rounded-lg shadow-sm bg-white overflow-hidden hover:shadow-md cursor-pointer"
            onClick={() => handleMonthClick(month)}
          >
            <div className="month-header p-2 bg-gray-100 text-center font-semibold">
              {loc.format(month.toDate(), "MMMM")}
            </div>

            <div className="month-days grid grid-cols-7 text-xs">
              {/* Day headers: Sun, Mon, etc. */}
              {["S", "M", "T", "W", "T", "F", "S"].map((dayName, i) => (
                <div key={i} className="day-header p-1 text-center text-gray-500">
                  {dayName}
                </div>
              ))}
              {/* Actual days */}
              {generateMonthDays(month).map((day, i) => (
                <div
                  key={i}
                  className={`day-cell p-1 text-center ${
                    !day.day ? "text-gray-300" : ""
                  } ${day.isToday ? "bg-blue-100 text-blue-700 font-bold" : ""} ${
                    day.events && day.events.length > 0 ? "has-events" : ""
                  } ${day.day ? "cursor-pointer hover:bg-gray-100" : ""}`}
                  onClick={(e) => {
                    // Only handle click for valid days
                    if (day.day && day.date) {
                      e.stopPropagation(); // Prevent triggering the month click
                      onNavigate(new Date(day.date));
                    }
                  }}
                >
                  {day.day}
                  {day.events && day.events.length > 0 && (
                    <div className="flex justify-center mt-0.5 space-x-0.5">
                      <div className="event-dot h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {day.events.length > 1 && (
                        <div className="event-dot h-1.5 w-1.5 rounded-full bg-green-500" />
                      )}
                      {day.events.length > 2 && (
                        <div className="event-dot h-1.5 w-1.5 rounded-full bg-red-500" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
