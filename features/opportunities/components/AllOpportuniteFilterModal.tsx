"use client";

import { useTranslation } from "react-i18next";
import { Formik, Form, Field } from "formik";
import Toggle from "@/components/ui/Toggle";
import SelectInput from "@/components/ui/SelectInput";
import GroupedSelectInput from "@/components/ui/GroupedSelectInput";
import BirthDateField from "@/components/ui/BirthDateField";
import { InterestTagsInput } from "@/components/ui/InterestTagsInput";
import FilterCheckBox from "@/components/ui/FilterCheckBox";
import AgeRange from "@/components/ui/AgeRange";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import { useLanguageStore } from "@/store/languageStore";
import { useQuery } from "@tanstack/react-query";
import { getDropdownChoices } from "@/features/services/api";
import { nationalityFilterOptions, OpportunityStatus } from "@/data/Constants";
import { useEffect } from "react";
import * as Yup from "yup";
import { useAuthStore } from "@/store/authStore";
import { GoogleMapsProvider } from "@/components/ui/GoogleMapsProvider";

interface AllOpportunitiesFilterModalProps {
  onApply: (filters: AllOpportunitiesFiltersData) => void;
  initialValues?: AllOpportunitiesFiltersData;
  onDirtyChange?: (dirty: boolean) => void;
  showLearnServeFields?: boolean;
  showVolunteerFields?: boolean;
}

export interface AllOpportunitiesFiltersData {
  startDate: string;
  endDate: string;
  tags: string[];
  location: string;
  gender: string;
  age: [number | null, number | null];
  opportunity_nationality: string;
  type: string;
  isRelief: boolean;
  isUrgent: boolean;
  isSpecialNeed: boolean;
  isInPerson: boolean;
  isOnline: boolean;
  matchMyInterest: boolean;
  status: string;
  sortBy: string;
}

interface ChoiceItem {
  id: number;
  value_en: string;
  value_ar: string;
}

const OpportuniteFilterModal = ({
  onApply,
  initialValues,
  onDirtyChange,
  showLearnServeFields,
  showVolunteerFields,
}: AllOpportunitiesFilterModalProps) => {
  const defaultValues: AllOpportunitiesFiltersData = {
    startDate: "",
    endDate: "",
    tags: [],
    location: "",
    gender: "",
    age: [null, null],
    opportunity_nationality: "",
    type: "",
    isRelief: false,
    isUrgent: false,
    isSpecialNeed: false,
    isInPerson: false,
    isOnline: false,
    matchMyInterest: false,
    status: "",
    sortBy: "",
  };

  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const user = useAuthStore((s) => s.user);

  const { data: typeData, isLoading: typeLoading } = useQuery({
    queryKey: ["dropdown", "filter-type"],
    queryFn: () => getDropdownChoices("filter-type"),
  });

  const { data: genderData, isLoading: genderLoading } = useQuery({
    queryKey: ["dropdown", "opportunity_gender"],
    queryFn: () => getDropdownChoices("opportunity_gender"),
  });

  const typeOrder = [
    "Volunteer",
    "Class/Workshop",
    "Course",
    "Consultation",
    "Internship",
  ];

  /**
   * Internship ("field training") is classified under Events rather than
   * Development. That is presentation only — it is still a
   * `learn_serve_opportunity` on the API and keeps the same routes — so it is
   * expressed by grouping it separately in this dropdown, and by sorting it last
   * so it never reads as one of the development types.
   */
  const EVENT_CLASSIFIED_TYPES = ["Internship"];

  type TypeOption = {
    label: string;
    value: number | string;
    value_en: string;
  };

  const rawTypeOptions =
    typeData?.data
      ?.map(
        (item: ChoiceItem): TypeOption => ({
          label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
          value: item.id,
          value_en: item.value_en,
        })
      )
      .sort(
        (a: TypeOption, b: TypeOption) =>
          typeOrder.indexOf(a.value_en) - typeOrder.indexOf(b.value_en)
      ) || [];

  const visibleTypeOptions =
    !showVolunteerFields && showLearnServeFields
      ? rawTypeOptions.filter((option: TypeOption) => option.value_en !== "Volunteer")
      : rawTypeOptions;

  const eventClassifiedOptions = visibleTypeOptions.filter(
    (option: TypeOption) => EVENT_CLASSIFIED_TYPES.includes(option.value_en)
  );
  const otherTypeOptions = visibleTypeOptions.filter(
    (option: TypeOption) => !EVENT_CLASSIFIED_TYPES.includes(option.value_en)
  );

  // Only introduce the group headings when there is actually something to group.
  const typeOptions = eventClassifiedOptions.length
    ? [
        ...otherTypeOptions.map((option: TypeOption) => ({
          ...option,
          value: String(option.value),
        })),
        {
          label: t("COMMON.EVENTS"),
          options: eventClassifiedOptions.map((option: TypeOption) => ({
            ...option,
            value: String(option.value),
          })),
        },
      ]
    : visibleTypeOptions.map((option: TypeOption) => ({
        ...option,
        value: String(option.value),
      }));

  const genderOptions =
    genderData?.data?.map((item: ChoiceItem) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: String(item.id),
    })) || [];

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

  return (
    <GoogleMapsProvider>
      <Formik
        initialValues={initialValues || defaultValues}
        validationSchema={validationSchema}
        onSubmit={(values) => {
          onApply(values);
        }}
      >
        {({ values, setFieldTouched, setFieldValue, dirty }) => {
          useEffect(() => {
            if (onDirtyChange) onDirtyChange(dirty);
          }, [dirty, onDirtyChange]);

          return (
            <Form className="opp-modal">
              <div className="pb-[10px] xss:pb-[20px]">
                <div
                  className={`grid grid-cols-2 md:grid-cols-4 miniscreen:grid-cols-2 miniscreen:gap-y-0 xss:grid-cols-1 xss:gap-0 md:gap-x-6 md:gap-y-4 ${
                    !(showVolunteerFields && !showLearnServeFields)
                      ? "mobilescreen:gap-x-6"
                      : "mobilescreen:gap-x-0"
                  } mobilescreen:gap-y-0 gap-x-6 gap-y-0`}
                >
                  {!(showVolunteerFields && !showLearnServeFields) && (
                    <div className="col-span-1">
                      <GroupedSelectInput
                        name="type"
                        label={t("COMMON.TYPE")}
                        options={typeOptions}
                        disabled={typeLoading}
                        isModal={true}
                      />
                    </div>
                  )}
                  <div
                    className={
                      !(showVolunteerFields && !showLearnServeFields)
                        ? "col-span-1"
                        : "col-span-2 md:col-span-2"
                    }
                  >
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
                  <div className="col-span-2 md:ml-0 miniscreen:ml-0 xss:col-span-1 bordclr">
                    <div className="flex xss:block gap-6">
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

                <div className="grid grid-cols-2 md:grid-cols-4 miniscreen:grid-cols-2 miniscreen:gap-y-0 xss:grid-cols-1 xss:gap-0 md:gap-x-6 md:gap-y-4 mobilescreen:gap-x-6 mobilescreen:gap-y-0 gap-x-6 gap-y-0">
                  <div>
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

                  <div>
                    <SelectInput
                      name="gender"
                      label={t("COMMON.GENDER")}
                      options={genderOptions}
                      disabled={genderLoading}
                      isModal={true}
                    />
                  </div>

                  <div className="">
                    <div className="flex gap-2 bordclr">
                      <AgeRange
                        name="age"
                        label={t("COMMON.AGE")}
                        isModal={true}
                        className="custom-border-age"
                      />
                    </div>
                  </div>

                  <div>
                    <SelectInput
                      name="opportunity_nationality"
                      label={t("COMMON.NATIONALITY_LABEL")}
                      options={nationalityFilterOptions.map((g) => ({
                        label: selectedLanguage === "ar" ? g.name_ar : g.name_en,
                        value: g.value,
                      }))}
                      disabled={false}
                      isModal={true}
                    />
                  </div>

                  <div>
                    <SelectInput
                      name="sortBy"
                      label={t("COMMON.SORT_BY")}
                      options={[
                        { label: t("COMMON.SORT_NEWEST_FIRST"), value: "newest" },
                        { label: t("COMMON.SORT_OLDEST_FIRST"), value: "oldest" },
                      ]}
                      disabled={false}
                      isModal={true}
                    />
                  </div>
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

                {!(showLearnServeFields && showVolunteerFields) && (
                  <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
                    {(!showLearnServeFields && showVolunteerFields) ||
                    (showLearnServeFields && showVolunteerFields) ? (
                      <div className="flex smallscreen2:flex-col gap-2 md:justify-between xsl:gap-4 xsmall:gap-2">
                        <>
                          <Field name="isRelief">
                            {({ field }: any) => (
                              <FilterCheckBox
                                id="isRelief"
                                label={t("COMMON.RELIEF")}
                                checked={field.value}
                                onChange={() => setFieldValue("isRelief", !field.value)}
                              />
                            )}
                          </Field>
                          <Field name="isUrgent">
                            {({ field }: any) => (
                              <FilterCheckBox
                                id="isUrgent"
                                label={t("COMMON.URGENT")}
                                checked={field.value}
                                onChange={() => setFieldValue("isUrgent", !field.value)}
                              />
                            )}
                          </Field>
                          <div>
                            <Field name="isSpecialNeed">
                              {({ field }: any) => (
                                <FilterCheckBox
                                  id="isSpecialNeed"
                                  label={t("COMMON.SPECIAL.NEED")}
                                  checked={field.value}
                                  onChange={() => setFieldValue("isSpecialNeed", !field.value)}
                                />
                              )}
                            </Field>
                          </div>
                        </>
                      </div>
                    ) : null}
                    {(!showVolunteerFields && showLearnServeFields) ||
                    (showLearnServeFields && showVolunteerFields) ? (
                      <div
                        className={`flex smallscreen2:flex-col smallscreen2:gap-1 gap-2 ${
                          showLearnServeFields && showVolunteerFields
                            ? "smallscreen2:border-t smallscreen2:pt-3"
                            : ""
                        } ${
                          showLearnServeFields && showVolunteerFields
                            ? selectedLanguage === "ar"
                              ? "md:border-r md:pr-6"
                              : "md:border-l md:pl-6"
                            : ""
                        } md:w-2/3 md:justify-between xsmall:gap-4 xsl:gap-4 smallscreen2:gap-2`}
                      >
                        <>
                          <Field name="isInPerson">
                            {({ field }: any) => (
                              <FilterCheckBox
                                id="isInPerson"
                                label={t("COMMON.IN_PERSON")}
                                checked={field.value}
                                onChange={() => setFieldValue("isInPerson", !field.value)}
                              />
                            )}
                          </Field>
                          <Field name="isOnline">
                            {({ field }: any) => (
                              <FilterCheckBox
                                id="isOnline"
                                label={t("COMMON.ONLINE")}
                                checked={field.value}
                                onChange={() => setFieldValue("isOnline", !field.value)}
                              />
                            )}
                          </Field>
                        </>
                      </div>
                    ) : null}
                  </div>
                )}

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
};

export default OpportuniteFilterModal;
export type { AllOpportunitiesFilterModalProps };
