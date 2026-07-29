"use client";

import { useMemo } from "react";
import { Form, Formik, FormikHelpers } from "formik";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import ModalInput from "@/components/ui/ModalInput";
import DatePickerInput from "@/components/ui/DateField";
import TimepickerInput from "@/components/ui/TimePicker";
import { Button } from "@/components/ui/Button";
import { createTimeSlot, updateTimeSlot } from "@/features/services/api";
import { formatDateToYYYYMMDD } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

export interface CreateTimeSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string | null;
  needed: number;
  opportunity: number;
  opportunity_start_date?: string;
  opportunity_end_date?: string;
  opportunity_start_time?: string;
  opportunity_end_time?: string;
}

interface CreateTimingProps {
  opportunityId: number;
  setOpenForm: () => void;
  refetch: () => void;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  editTimeSlot?: CreateTimeSlot | null;
}

const parseDate = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Extract hours and minutes from time strings (format: "HH:MM:SS")
const parseTimeString = (timeString: string) => {
  if (!timeString) return { hours: 0, minutes: 0 };
  const [hours, minutes] = timeString.split(":").map(Number);
  return { hours, minutes };
};

export default function CreateTiming({
  opportunityId,
  setOpenForm,
  refetch,
  startDate,
  endDate,
  startTime,
  endTime,
  editTimeSlot = null,
}: CreateTimingProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const createTimeSlotMutation = useMutation({ mutationFn: createTimeSlot });
  const updateTimeSlotMutation = useMutation({ mutationFn: updateTimeSlot });

  const isEditing = Boolean(editTimeSlot);
  const isLoading =
    createTimeSlotMutation.isPending || updateTimeSlotMutation.isPending;

  // When editing, the slot carries its own copy of the opportunity's window;
  // prefer it so validation matches what the slot was created against.
  const opportunityStartDate = useMemo(
    () =>
      parseDate(
        (isEditing && editTimeSlot?.opportunity_start_date) || startDate
      ),
    [isEditing, editTimeSlot, startDate]
  );

  const opportunityEndDate = useMemo(
    () =>
      parseDate((isEditing && editTimeSlot?.opportunity_end_date) || endDate),
    [isEditing, editTimeSlot, endDate]
  );

  const oppStartTime = useMemo(
    () =>
      parseTimeString(
        (isEditing && editTimeSlot?.opportunity_start_time) || startTime
      ),
    [isEditing, editTimeSlot, startTime]
  );

  const oppEndTime = useMemo(
    () =>
      parseTimeString(
        (isEditing && editTimeSlot?.opportunity_end_time) || endTime
      ),
    [isEditing, editTimeSlot, endTime]
  );

  // Editing: fall back to the opportunity start when the stored date is out of range
  let initialDate: string;
  if (editTimeSlot) {
    const editSlotDate = new Date(editTimeSlot.date);
    if (
      opportunityStartDate &&
      opportunityEndDate &&
      editSlotDate >= opportunityStartDate &&
      editSlotDate <= opportunityEndDate
    ) {
      initialDate = formatDateToYYYYMMDD(editTimeSlot.date);
    } else {
      initialDate = editTimeSlot.opportunity_start_date || startDate;
    }
  } else {
    initialDate = startDate || "";
  }

  const initialValues = {
    date: initialDate,
    startTime: editTimeSlot ? editTimeSlot.start_time.slice(0, 5) : "",
    endTime:
      editTimeSlot && editTimeSlot.end_time
        ? editTimeSlot.end_time.slice(0, 5)
        : "",
    needed: editTimeSlot ? String(editTimeSlot.needed) : "",
  };

  const validationSchema = Yup.object({
    date: Yup.date()
      .required("Date is required")
      .test(
        "is-within-opportunity-range",
        "Date must be within the opportunity's start and end dates",
        function (value) {
          if (!value || !opportunityStartDate || !opportunityEndDate) {
            return false;
          }

          const selectedDate = new Date(value);
          selectedDate.setHours(0, 0, 0, 0);
          const startDateClone = new Date(opportunityStartDate);
          startDateClone.setHours(0, 0, 0, 0);
          const endDateClone = new Date(opportunityEndDate);
          endDateClone.setHours(0, 0, 0, 0);

          return selectedDate >= startDateClone && selectedDate <= endDateClone;
        }
      ),
    startTime: Yup.string()
      .required("Start time is required")
      .test(
        "is-within-opportunity-time-range",
        "Time must be within the opportunity's start and end times",
        function (value) {
          if (!value || !startTime || !endTime) return false;

          const selectedDate = this.parent.date
            ? new Date(this.parent.date)
            : null;
          if (!selectedDate || !opportunityStartDate || !opportunityEndDate) {
            return false;
          }

          const [hours, minutes] = value.split(":").map(Number);
          const totalMinutesSelected = hours * 60 + minutes;

          // Only the boundary days are constrained by the opportunity's clock
          if (
            selectedDate.toDateString() === opportunityStartDate.toDateString()
          ) {
            return (
              totalMinutesSelected >=
              oppStartTime.hours * 60 + oppStartTime.minutes
            );
          }

          if (
            selectedDate.toDateString() === opportunityEndDate.toDateString()
          ) {
            return (
              totalMinutesSelected <=
              oppEndTime.hours * 60 + oppEndTime.minutes
            );
          }

          return true;
        }
      ),
    endTime: Yup.string()
      .required("End time is required")
      .test(
        "end-time-after-start-time",
        "End time must be after start time",
        function (value) {
          const start = this.parent.startTime;
          if (!start || !value) return true;
          const [startHour, startMinute] = start.split(":").map(Number);
          const [endHour, endMinute] = value.split(":").map(Number);
          return endHour * 60 + endMinute > startHour * 60 + startMinute;
        }
      ),
    needed: Yup.number().required("Number of participants is required").min(1),
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

      const payload = {
        opportunity: opportunityId,
        date: formattedDate,
        start_time: `${values.startTime}:00`,
        end_time: `${values.endTime}:00`,
        participants_needed: parseInt(values.needed, 10),
      };

      if (isEditing && editTimeSlot) {
        if (!editTimeSlot.id) {
          toast.error(t("COMMON.TOAST.MISSING_TIME_SLOT_ID"));
          return;
        }

        await updateTimeSlotMutation.mutateAsync({
          id: String(editTimeSlot.id),
          opportunity_id: String(opportunityId),
          data: payload,
        });
        toast.success(t("COMMON.TOAST.UPDATE_TIME_SLOT_SUCCESS"));
      } else {
        await createTimeSlotMutation.mutateAsync(payload);
        toast.success(t("COMMON.TOAST.CREATE_TIME_SLOT_SUCCESS"));
      }

      resetForm();
      setOpenForm();
      refetch();
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.errors && Object.keys(data.errors).length > 0) {
        Object.keys(data.errors).forEach((key) => {
          toast.error(
            data.errors[key][selectedLanguage] ||
              t("COMMON.TOAST.CREATE_TIME_SLOT_FAILED")
          );
        });
      } else if (data?.message_en || data?.message_ar) {
        toast.error(
          data[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.CREATE_TIME_SLOT_FAILED")
        );
      } else {
        toast.error(
          data?.date?.[0] ||
            (isEditing
              ? t("COMMON.TOAST.UPDATE_TIME_SLOT_FAILED")
              : t("COMMON.TOAST.CREATE_TIME_SLOT_FAILED"))
        );
      }
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
            <div className="grid grid-cols-2 mobilescreen:grid-cols-1 md:grid-cols-2 gap-6 relative selectfiled">
              <div>
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-5 mobilescreen:pb-2">
                  {t("COMMON.SELECT_DATE")}
                </p>
                <DatePickerInput
                  name="date"
                  label={t("COMMON.DATE")}
                  rmdpClassname="placeholder-primary-5"
                  enforceStartDate={opportunityStartDate ?? undefined}
                  maxDate={opportunityEndDate ?? undefined}
                />
              </div>
              <div className="w-full">
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-5 mobilescreen:pb-2">
                  {t("COMMON.NEEDED")}
                </p>
                <ModalInput
                  name="needed"
                  placeholder={t("COMMON.NEEDED")}
                  type="tel"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 mobilescreen:grid-cols-1 md:grid-cols-2 gap-6 relative selectfiled">
              <div>
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-5 mobilescreen:pb-2">
                  {t("COMMON.START_TIME")}
                </p>
                <TimepickerInput
                  name="startTime"
                  label={t("COMMON.START_TIME")}
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-5 mobilescreen:pb-2">
                  {t("COMMON.END_TIME")}
                </p>
                <TimepickerInput
                  name="endTime"
                  label={t("COMMON.END_TIME")}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex xss:flex-col justify-center w-full gap-5 mt-6">
              <Button
                variant="primary"
                type="submit"
                size="medium"
                disabled={isLoading || (!isEditing && (!dirty || !isValid))}
                className="xss:!w-full"
              >
                {isEditing ? t("COMMON.SAVE") : t("COMMON.SUBMIT")}
              </Button>
              <Button
                variant="secondary"
                size="medium"
                type="button"
                className="xss:!w-full"
                disabled={isLoading}
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
