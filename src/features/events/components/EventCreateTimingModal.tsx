"use client";

import { useMemo } from "react";
import { Form, Formik, FormikHelpers } from "formik";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import ModalInput from "@/components/ui/ModalInput";
import TimepickerInput from "@/components/ui/TimePicker";
import DatePickerInput from "@/components/ui/DateField";
import { Button } from "@/components/ui/Button";
import i18n from "@/lib/i18n/config";
import { formatDateToYYYYMMDD } from "@/lib/helpers";
import { YupNumberOnly } from "@/lib/schema";
import { useTimeSlotsStore } from "@/store/timeSlotsStore";
import type { TimeSlot } from "./EventTimeSlotModal";

interface CreateTimingProps {
  setOpenForm: () => void;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  editTimeSlot?: TimeSlot | null;
  participantsNeeded: number;
  autoSetTimeOnClick?: boolean;
}

const parseDate = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

const parseTimeString = (timeString: string) => {
  if (!timeString) return { hours: 0, minutes: 0 };
  const [hours, minutes] = timeString.split(":").map(Number);
  return { hours, minutes };
};

export default function EventCreateTimingModal({
  setOpenForm,
  startDate,
  endDate,
  startTime,
  endTime,
  editTimeSlot = null,
  participantsNeeded,
  autoSetTimeOnClick = true,
}: CreateTimingProps) {
  const { t } = useTranslation();
  const timeSlots = useTimeSlotsStore((s) => s.timeSlots);
  const addTimeSlot = useTimeSlotsStore((s) => s.addTimeSlot);
  const updateTimeSlot = useTimeSlotsStore((s) => s.updateTimeSlot);
  const isEditing = Boolean(editTimeSlot);

  const eventStartDate = useMemo(() => parseDate(startDate), [startDate]);
  const eventEndDate = useMemo(() => parseDate(endDate), [endDate]);
  const eventStartTime = useMemo(() => parseTimeString(startTime), [startTime]);
  const eventEndTime = useMemo(() => parseTimeString(endTime), [endTime]);

  // Participants already claimed by the other slots
  const totalNeeded = useMemo(
    () =>
      timeSlots.reduce((sum, slot) => {
        // The slot being edited doesn't count against itself
        if (isEditing && editTimeSlot && slot.id === editTimeSlot.id) return sum;
        return sum + (slot.participants_needed || 0);
      }, 0),
    [timeSlots, isEditing, editTimeSlot]
  );

  const remainingParticipants = useMemo(
    () => Math.max(0, participantsNeeded - totalNeeded),
    [participantsNeeded, totalNeeded]
  );

  let initialDate: string;
  if (editTimeSlot) {
    const editSlotDate = new Date(editTimeSlot.date);
    // Fall back to the event's start when the stored date fell outside the range
    if (
      eventStartDate &&
      eventEndDate &&
      editSlotDate >= eventStartDate &&
      editSlotDate <= eventEndDate
    ) {
      initialDate = formatDateToYYYYMMDD(editTimeSlot.date);
    } else {
      initialDate = editTimeSlot.event_start_date || startDate;
    }
  } else {
    initialDate = startDate || "";
  }

  const initialValues = {
    date: initialDate,
    startTime: editTimeSlot
      ? editTimeSlot.start_time.slice(0, 5)
      : autoSetTimeOnClick
        ? startTime?.slice(0, 5)
        : "",
    endTime:
      editTimeSlot && editTimeSlot.end_time
        ? editTimeSlot.end_time.slice(0, 5)
        : autoSetTimeOnClick
          ? endTime?.slice(0, 5)
          : "",
    needed: editTimeSlot ? String(editTimeSlot.participants_needed) : "",
  };

  const withinEventTimeRange = (value?: string) => {
    if (!value || !eventStartTime || !eventEndTime) return false;
    const [hour, minute] = value.split(":").map(Number);
    const total = hour * 60 + minute;
    return (
      total >= eventStartTime.hours * 60 + eventStartTime.minutes &&
      total <= eventEndTime.hours * 60 + eventEndTime.minutes
    );
  };

  const validationSchema = Yup.object({
    date: Yup.date()
      .required("Date is required")
      .test(
        "is-within-event-date-range",
        i18n.t("COMMON.DATE_WITHIN_RANGE"),
        function (value) {
          if (!value || !eventStartDate || !eventEndDate) return false;

          const selectedDate = new Date(value);
          selectedDate.setHours(0, 0, 0, 0);

          const startDateClone = new Date(eventStartDate);
          startDateClone.setHours(0, 0, 0, 0);
          const endDateClone = new Date(eventEndDate);
          endDateClone.setHours(0, 0, 0, 0);

          return selectedDate >= startDateClone && selectedDate <= endDateClone;
        }
      ),

    startTime: Yup.string()
      .required("Start time is required")
      .test(
        "start-time-in-event-range",
        i18n.t("COMMON.START_TIME_WITHIN_RANGE"),
        withinEventTimeRange
      ),

    endTime: Yup.string()
      .required("End time is required")
      .test(
        "end-time-in-event-range",
        i18n.t("COMMON.END_TIME_WITHIN_RANGE"),
        withinEventTimeRange
      )
      .test(
        "end-after-start",
        i18n.t("COMMON.END_TIME_AFTER_START"),
        function (value) {
          const start = this.parent.startTime;
          if (!start || !value) return false;
          const [startHour, startMinute] = start.split(":").map(Number);
          const [endHour, endMinute] = value.split(":").map(Number);
          return endHour * 60 + endMinute > startHour * 60 + startMinute;
        }
      ),

    needed: YupNumberOnly.test(
      "max-participants",
      i18n.t("COMMON.MAX_PARTICIPANTS_EXCEEDED", {
        max: remainingParticipants,
      }),
      function (value) {
        if (!value) return false;
        return parseInt(value, 10) <= remainingParticipants;
      }
    ),
  });

  const handleSubmit = async (
    values: typeof initialValues,
    { resetForm }: FormikHelpers<typeof initialValues>
  ) => {
    try {
      const formattedDate = formatDateToYYYYMMDD(values.date);
      if (!formattedDate) {
        toast.error(t("COMMON.INVALID_DATE_FORMAT"));
        return;
      }

      const timeSlot: TimeSlot = {
        id: isEditing && editTimeSlot ? editTimeSlot.id : Date.now(),
        date: formattedDate,
        start_time: `${values.startTime}:00`,
        end_time: `${values.endTime}:00`,
        participants_needed: parseInt(values.needed, 10),
        event_start_date: startDate,
        event_end_date: endDate,
        event_start_time: startTime,
        event_end_time: endTime,
        isSaved: false,
      };

      if (isEditing && editTimeSlot) {
        updateTimeSlot(timeSlot);
        toast.success(t("COMMON.TOAST.UPDATE_TIME_SLOT_SUCCESS"));
      } else {
        addTimeSlot(timeSlot);
      }

      resetForm();
      setOpenForm();
    } catch {
      toast.error(t("COMMON.TOAST.CREATE_TIME_SLOT_FAILED"));
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ dirty, isValid }) => (
        <div className="md:w-[100%] rounded-lg bg-white filtermodal">
          <Form id="createTimingForm">
            <div className="grid grid-cols-2 mobilescreen:grid-cols-1 md:grid-cols-2 gap-6 mobilescreen:gap-x-6 mobilescreen:gap-y-0 relative selectfiled">
              <div>
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-3 mobilescreen:pb-1">
                  {t("COMMON.SELECT_DATE")}
                </p>
                <DatePickerInput
                  name="date"
                  label={t("COMMON.DATE")}
                  rmdpClassname="placeholder-primary-5"
                  enforceStartDate={eventStartDate ?? undefined}
                  maxDate={eventEndDate ?? undefined}
                />
              </div>
              <div className="w-full">
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-3 mobilescreen:pb-1">
                  {t("COMMON.NEEDED")}
                </p>
                <ModalInput
                  name="needed"
                  placeholder={t("COMMON.NEEDED")}
                  type="tel"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 mobilescreen:grid-cols-1 md:grid-cols-2 gap-6 mobilescreen:gap-x-6 mobilescreen:gap-y-0 relative selectfiled">
              <div>
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-3 mobilescreen:pb-1">
                  {t("COMMON.START_TIME")}
                </p>
                <TimepickerInput
                  name="startTime"
                  label={t("COMMON.START_TIME")}
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-3 mobilescreen:pb-1">
                  {t("COMMON.END_TIME")}
                </p>
                <TimepickerInput
                  name="endTime"
                  label={t("COMMON.END_TIME")}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex xss:flex-col justify-center w-full gap-5 mt-4">
              <Button
                variant="primary"
                type="submit"
                size="medium"
                disabled={!isEditing && (!dirty || !isValid)}
                className="xss:!w-full"
              >
                {isEditing ? t("COMMON.SAVE") : t("COMMON.SUBMIT")}
              </Button>
              <Button
                variant="secondary"
                size="medium"
                type="button"
                className="xss:!w-full"
                onClick={() => setOpenForm()}
              >
                {t("COMMON.CANCEL")}
              </Button>
            </div>
          </Form>
        </div>
      )}
    </Formik>
  );
}
