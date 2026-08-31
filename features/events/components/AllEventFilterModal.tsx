"use client";

import { Formik, Form, Field, useFormikContext } from "formik";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import Toggle from "@/components/ui/Toggle";
import SelectInput from "@/components/ui/SelectInput";
import BirthDateField from "@/components/ui/BirthDateField";
import { InterestTagsInput } from "@/components/ui/InterestTagsInput";
import { useLanguageStore } from "@/store/languageStore";
import { useQuery } from "@tanstack/react-query";
import { getDropdownChoices } from "@/features/services/api";
import { OpportunityStatus } from "@/data/Constants";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import AgeRange from "@/components/ui/AgeRange";
import { useEffect } from "react";
import * as Yup from "yup";
import { GoogleMapsProvider } from "@/components/ui/GoogleMapsProvider";

interface AllEventFilterModalProps {
  onApply: (filters: AllEventsFiltersData) => void;
  initialValues?: AllEventsFiltersData;
  onDirtyChange?: (dirty: boolean) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
  isInnerModal?: boolean;
}

export interface AllEventsFiltersData {
  startDate: string;
  endDate: string;
  tags: string[];
  location: string;
  gender: string;
  age: [number | null, number | null];
  type: string;
  participation_type: string;
  matchMyInterest: boolean;
  status: string;
}

interface ChoiceItem {
  id: number;
  value_en: string;
  value_ar: string;
}

/**
 * Reports dirty/empty state from inside the Formik tree via context, rather
 * than calling `useEffect` directly in the render prop (not a valid hook
 * position — see `VolunteerFilterModal.tsx`'s `DirtyReporter` for the same
 * pattern).
 */
function FilterStateReporter({
  defaultValues,
  onDirtyChange,
  onEmptyChange,
}: {
  defaultValues: AllEventsFiltersData;
  onDirtyChange?: (dirty: boolean) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
}) {
  const { values, dirty } = useFormikContext<AllEventsFiltersData>();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onEmptyChange?.(JSON.stringify(values) === JSON.stringify(defaultValues));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, onEmptyChange]);

  return null;
}

function AllEventFilterModal({
  onApply,
  initialValues,
  onDirtyChange,
  onEmptyChange,
  isInnerModal,
}: AllEventFilterModalProps) {
  const defaultValues: AllEventsFiltersData = {
    startDate: "",
    endDate: "",
    tags: [],
    location: "",
    gender: "",
    age: [null, null],
    type: "",
    participation_type: "",
    matchMyInterest: false,
    status: "",
  };

  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const user = useAuthStore((s) => s.user);

  const validationSchema = Yup.object().shape({
    startDate: Yup.string(),
    endDate: Yup.string().test(
      "endDate-after-startDate",
      selectedLanguage === "ar"
        ? "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء"
        : "End date must be after start date",
      function (value) {
        const { startDate } = this.parent;
        if (!startDate || !value) return true;
        return new Date(value) >= new Date(startDate);
      }
    ),
  });

  const { data: genderData, isLoading: genderLoading } = useQuery({
    queryKey: ["dropdown", "opportunity_gender"],
    queryFn: () => getDropdownChoices("opportunity_gender"),
  });

  const { data: eventTypeData, isLoading: eventTypeLoading } = useQuery({
    queryKey: ["dropdown", "event_type"],
    queryFn: () => getDropdownChoices("event_type"),
  });

  const { data: participationTypeData, isLoading: participationTypeLoading } = useQuery({
    queryKey: ["dropdown", "event_participation_type"],
    queryFn: () => getDropdownChoices("event_participation_type"),
  });

  const genderOptions =
    genderData?.data?.map((item: ChoiceItem) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: String(item.id),
    })) || [];

  const eventTypeOptions = (() => {
    const data = eventTypeData?.data || [];
    const isHub = (item: ChoiceItem) => item.value_en === "Hub";
    const hubItems = data.filter(isHub);
    const otherItems = data.filter((i: ChoiceItem) => !isHub(i));
    const ordered = [...hubItems, ...otherItems];
    return ordered.map((item: ChoiceItem) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: String(item.id),
    }));
  })();

  const participationTypeOrder = [
    "Free Event",
    "Free Event (Registration Required)",
    "Paid Event",
  ];

  const participationTypeOptions =
    participationTypeData?.data
      ?.map((item: ChoiceItem) => ({
        label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
        value: String(item.id),
        value_en: item.value_en,
      }))
      .sort(
        (a: any, b: any) =>
          participationTypeOrder.indexOf(a.value_en) - participationTypeOrder.indexOf(b.value_en)
      ) || [];

  return (
    <GoogleMapsProvider>
      <Formik
        initialValues={initialValues || defaultValues}
        validationSchema={validationSchema}
        onSubmit={(values) => {
          onApply(values);
        }}
      >
        {({ values, setFieldTouched, setFieldValue }) => {
          return (
            <Form className="event-modal">
              <FilterStateReporter
                defaultValues={defaultValues}
                onDirtyChange={onDirtyChange}
                onEmptyChange={onEmptyChange}
              />
              <div className="xss:pb-[20px] pb-[10px]">
                <div className="grid grid-cols-2 miniscreen:grid-cols-2 miniscreen:gap-y-0 2xl:gap-6 lg:gap-6 md:gap-6 gap-6 mb-0 md:grid-cols-4 mobilescreen:gap-x-6 mobilescreen:gap-y-0 xs:flex xs:flex-col xs:gap-0">
                  {!isInnerModal && (
                    <div className="col-span-1">
                      <SelectInput
                        name="type"
                        label={t("COMMON.TYPE")}
                        options={eventTypeOptions}
                        disabled={eventTypeLoading}
                        isModal={true}
                      />
                    </div>
                  )}
                  <div className={`col-span-1 ${isInnerModal ? "col-span-2" : ""}`}>
                    <SelectInput
                      name="status"
                      label={t("COMMON.STATUS")}
                      options={OpportunityStatus.map((g) => ({
                        label: selectedLanguage === "ar" ? g.name_ar : g.name_en,
                        value: g.value,
                      }))}
                      disabled={false}
                      isModal={true}
                    />
                  </div>
                  <div className="col-span-2 md:hidden">
                    <SelectInput
                      name="participation_type"
                      label={t("COMMON.PARTICIPATION_TYPE")}
                      options={participationTypeOptions}
                      disabled={participationTypeLoading}
                      isModal={true}
                    />
                  </div>
                  <div className="col-span-2 bordclr">
                    <div className="flex xs:block 2xl:gap-6 lg:gap-6 md:gap-6 gap-6">
                      <BirthDateField
                        name="startDate"
                        label={t("COMMON.START.DATE")}
                        rmdpClassname="placeholder-primary-5"
                      />
                      <BirthDateField
                        name="endDate"
                        label={t("COMMON.END.DATE")}
                        rmdpClassname="placeholder-primary-5"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 miniscreen:grid-cols-2 miniscreen:gap-y-0 2xl:gap-6 lg:gap-6 md:gap-6 gap-6 mb-0 md:grid-cols-4 mobilescreen:gap-x-6 mobilescreen:gap-y-0 xs:flex xs:flex-col xs:gap-0">
                  <div className="col-span-2 md:col-span-2">
                    <AutocompleteInput
                      name="location"
                      label={t("COMMON.LOCATION")}
                      value={values.location}
                      onChange={(val) => {
                        setFieldTouched("location", true);
                        setFieldValue("location", val);
                      }}
                      className="w-full custom-border"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-1">
                    <SelectInput
                      name="gender"
                      label={t("COMMON.GENDER")}
                      options={genderOptions}
                      disabled={genderLoading}
                      isModal={true}
                    />
                  </div>

                  <div className="col-span-1 md:col-span-1">
                    <div className="flex gap-2 w-full bordclr">
                      <AgeRange name="age" label={t("COMMON.AGE")} isModal={true} className="custom-border-age" />
                    </div>
                  </div>
                </div>

                <div className="mb-6 hidden md:block">
                  <SelectInput
                    name="participation_type"
                    label={t("COMMON.PARTICIPATION_TYPE")}
                    options={participationTypeOptions}
                    disabled={participationTypeLoading}
                    isModal={true}
                  />
                </div>

                <div className="mb-4 tags">
                  <InterestTagsInput
                    name="tags"
                    label={t("COMMON.TAGS")}
                    setFieldValue={setFieldValue}
                    setFieldTouched={setFieldTouched}
                    values={values.tags}
                    errors={undefined}
                    notTransparent={true}
                  />
                </div>

                {user && (
                  <div className="mb-6">
                    <Field name="matchMyInterest">
                      {({ field }: any) => (
                        <Toggle
                          label={t("COMMON.MATCH.INTREST")}
                          checked={field.value}
                          onChange={() => setFieldValue("matchMyInterest", !field.value)}
                        />
                      )}
                    </Field>
                  </div>
                )}
              </div>
            </Form>
          );
        }}
      </Formik>
    </GoogleMapsProvider>
  );
}

export default AllEventFilterModal;
