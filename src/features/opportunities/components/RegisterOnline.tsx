"use client";

import { useEffect, useMemo, useState } from "react";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import SelectInput from "@/components/ui/SelectInput";
import { getConsultationTimeSlots } from "@/features/opportunities/services/registrations";
import { registerForLearnServeOpportunity } from "@/features/opportunities/services/learnServe";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";
import type { LearnServeRegistrationDetails } from "./ConfirmRegistrationModal";

interface ConsultationTimeSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
}

interface RegisterOnlineProps {
  onClose: () => void;
  opportunityId: string;
  opportunityDetails: LearnServeRegistrationDetails;
}

interface FormValues {
  selectedSlotId?: number;
  dateSelector?: string;
}

const DAYS_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Time-slot picker for consultation-hours opportunities. */
export default function RegisterOnline({
  onClose,
  opportunityId,
  opportunityDetails,
}: RegisterOnlineProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const timeSlotQuery = useQuery({
    queryKey: ["consultation-time-slots", opportunityId],
    queryFn: () => getConsultationTimeSlots(opportunityId),
    enabled: Boolean(opportunityId),
  });

  const registerMutation = useMutation({
    mutationFn: registerForLearnServeOpportunity,
  });

  const timeSlots: ConsultationTimeSlot[] = useMemo(
    () => timeSlotQuery.data?.data ?? [],
    [timeSlotQuery.data]
  );

  const timeSlotsByDate = useMemo(
    () =>
      timeSlots.reduce<Record<string, ConsultationTimeSlot[]>>((acc, slot) => {
        (acc[slot.date] ||= []).push(slot);
        return acc;
      }, {}),
    [timeSlots]
  );

  const dates = useMemo(() => Object.keys(timeSlotsByDate), [timeSlotsByDate]);

  const earliestDate = useMemo(() => {
    if (dates.length === 0) return "";
    return [...dates].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    )[0];
  }, [dates]);

  useEffect(() => {
    if (earliestDate && !selectedDate) {
      setSelectedDate(earliestDate);
    }
  }, [earliestDate, selectedDate]);

  const formatDate = (dateString: string) => {
    const date = moment(dateString);
    const dayName =
      selectedLanguage === "ar"
        ? DAYS_AR[date.day()]
        : DAYS_EN[date.day()];
    const monthName =
      selectedLanguage === "ar"
        ? MONTHS_AR[date.month()]
        : MONTHS_EN[date.month()];
    return `${dayName}, ${monthName} ${date.date()}, ${date.year()}`;
  };

  const formatTime = (timeString: string) => {
    const time = moment(timeString, "HH:mm:ss");
    if (selectedLanguage !== "ar") return time.format("h:mm a");

    // Arabic uses ص / م rather than am / pm
    const hour = time.hour();
    const minute = time.minute();
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minute < 10 ? `0${minute}` : minute} ${hour < 12 ? "ص" : "م"}`;
  };

  const validationSchema = Yup.object({
    selectedSlotId: Yup.number().required(t("COMMON.SELECT_A_TIME")),
    dateSelector: Yup.string().required(t("COMMON.SELECT_A_DATE")),
  });

  const handleSubmit = async (values: FormValues) => {
    if (!values.selectedSlotId) return;

    try {
      await registerMutation.mutateAsync({
        opportunity_id: opportunityId,
        time_slot_id: values.selectedSlotId,
      });

      toast.success(t("COMMON.TOAST.TIME_SLOT_REGISTRATION_SUCCESSFUL"));
      setNavState(NAV_STATE_KEYS.opportunityThankyou, {
        ...opportunityDetails,
        islearnserve: true,
      });
      onClose();
      router.push("/register-now");
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.errors && Object.keys(data.errors).length > 0) {
        Object.keys(data.errors).forEach((key) => {
          toast.error(
            data.errors[key][selectedLanguage] ||
              t("COMMON.TOAST.TIME_SLOT_REGISTRATION_FAILED")
          );
        });
      } else if (data?.message_en || data?.message_ar) {
        toast.error(
          data[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.TIME_SLOT_REGISTRATION_FAILED")
        );
      } else {
        toast.error(t("COMMON.TOAST.TIME_SLOT_REGISTRATION_FAILED"));
      }
    }
  };

  if (timeSlotQuery.isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    );
  }

  if (timeSlotQuery.isError) {
    return (
      <div className="text-center text-red-500 py-8">
        {t("COMMON.TOAST.REGISTRATION_FAILED")}
      </div>
    );
  }

  if (!timeSlots.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t("COMMON.NO_TIME_SLOTS_AVAILABLE")}
      </div>
    );
  }

  return (
    <Formik
      initialValues={{
        selectedSlotId: undefined as number | undefined,
        dateSelector: earliestDate,
      }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ isSubmitting, setFieldValue, values, errors, touched }) => (
        <div className="md:w-[100%] rounded-lg bg-white filtermodal">
          <Form>
            <div className="text-center pb-4 flex justify-center">
              <div
                className="inline-block"
                style={{ minWidth: "200px", maxWidth: "fit-content" }}
              >
                <SelectInput
                  name="dateSelector"
                  label=""
                  options={dates.map((date) => ({
                    label: formatDate(date),
                    value: date,
                  }))}
                  className="mb-0"
                  isClearable={false}
                  onChange={(option) => {
                    if (option) {
                      setSelectedDate(option.value);
                      setFieldValue("dateSelector", option.value);
                    }
                  }}
                />
              </div>
            </div>

            <p className="text-primary-5 text-4xl font-bold pb-[20px] mobilescreen:pb-6 mobilescreen:text-[32px] smallscreen:text-[32px] text-center">
              {t("COMMON.SELECT_TIME")}
            </p>

            <div className="px-6 md:px-12">
              {selectedDate && (
                <div className="mb-4 flex justify-center">
                  <div
                    className={`grid ${
                      timeSlotsByDate[selectedDate]?.length === 1
                        ? "grid-cols-1 justify-items-center"
                        : "grid-cols-1 md:grid-cols-2"
                    } gap-4`}
                  >
                    {(timeSlotsByDate[selectedDate] ?? []).map((slot) => (
                      <div
                        key={slot.id}
                        className={`rounded-[15px] py-4 px-8 cursor-pointer text-center h-[84px] mobilescreen:h-[65px] mobilescreen:w-[220px] w-[252px] flex items-center justify-center extrasmall:w-auto ${
                          values.selectedSlotId === slot.id
                            ? "bg-primary-5 text-white extrasmall:text-base"
                            : "bg-[#EFF0F6] text-[#181822CC]/80 extrasmall:text-base"
                        }`}
                        onClick={() => setFieldValue("selectedSlotId", slot.id)}
                      >
                        <p className="text-lg mobilescreen:text-sm">
                          {`${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(touched.selectedSlotId || isSubmitting) &&
                errors.selectedSlotId && (
                  <div className="text-red-500 text-sm text-center mt-2">
                    {t("COMMON.SELECT_A_TIME")}
                  </div>
                )}

              <div className="flex justify-center mt-[30px]">
                <Button
                  type="submit"
                  variant="primary"
                  size="medium"
                  className="py-4 !bg-primary-5"
                  onClick={() => {
                    // Force the slot field to validate even when never touched
                    if (!values.selectedSlotId) {
                      setFieldValue("selectedSlotId", undefined, true);
                    }
                  }}
                  disabled={isSubmitting || registerMutation.isPending}
                >
                  {t("COMMON.CONFIRM")}
                </Button>
              </div>
            </div>
          </Form>
        </div>
      )}
    </Formik>
  );
}
