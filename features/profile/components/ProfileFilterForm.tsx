"use client";

import { useEffect } from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";

import BirthDateField from "@/components/ui/BirthDateField";
import SelectInput from "@/components/ui/SelectInput";
import { InterestTagsInput } from "@/components/ui/InterestTagsInput";
import { OpportunityCategories, OpportunityStatus } from "@/data/Constants";
import { useLanguageStore } from "@/store/languageStore";

interface FilterModalProps {
  onApply: (filters: FiltersData) => void;
  initialValues?: FiltersData;
  formikRef?: React.RefObject<{ submitForm: () => Promise<void> } | null>;
  onDirtyChange?: (dirty: boolean) => void;
  isEventFilter?: boolean; // Optional prop to indicate if this is for events
  type?: boolean;
  activeTab?: string; // To identify which tab is active
}

export interface FiltersData {
  startDate: string;
  endDate: string;
  category: string;
  status: string;
  tags?: string[];
  opportunity_type?: string;
  opportunity_status?: string;
}

export const EMPTY_PROFILE_FILTERS: FiltersData = {
  startDate: "",
  endDate: "",
  category: "",
  status: "",
  tags: [],
  opportunity_type: "",
  opportunity_status: "",
};

/** Reports Formik's dirty flag upward without putting a hook in the render prop. */
function DirtyListener({
  dirty,
  onDirtyChange,
}: {
  dirty: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  return null;
}

export default function ProfileFilterForm({
  onApply,
  initialValues,
  formikRef,
  onDirtyChange,
  isEventFilter,
  type = false,
  activeTab,
}: FilterModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  // Validation schema for date logic
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

  const options = OpportunityCategories.map((g) => ({
    label: selectedLanguage === "ar" ? g.name_ar : g.name_en,
    value: g.value,
  }));

  return (
    <Formik
      initialValues={initialValues || EMPTY_PROFILE_FILTERS}
      validationSchema={validationSchema}
      onSubmit={(
        values: FiltersData,
        { setSubmitting }: FormikHelpers<FiltersData>
      ) => {
        onApply(values); // Pass the form values to the parent
        setSubmitting(false); // Reset submitting state
      }}
      innerRef={(formik) => {
        // Assign Formik instance to the ref
        if (formik && formikRef) {
          formikRef.current = { submitForm: formik.submitForm };
        }
      }}
    >
      {({ setFieldValue, values, errors, touched, setFieldTouched, dirty }) => (
        <div className="md:w-[100%] rounded-lg bg-white xs1:pb-[20px] pb-[10px]">
          <DirtyListener dirty={dirty} onDirtyChange={onDirtyChange} />
          <Form className="profile-modal">
            {!type || isEventFilter ? (
              // When type is hidden, show start date, end date, status in one row
              <div className="flex gap-6 xs1:block selectfiled">
                <div
                  className={`block ${
                    isEventFilter ? "w-[33%]" : "w-[50%]"
                  } mobilescreen:w-[100%]`}
                >
                  <BirthDateField
                    name="startDate"
                    label={t("COMMON.START.DATE")}
                    rmdpClassname="placeholder-primary-5 xs:pb-0"
                  />
                </div>
                <div
                  className={`block ${
                    isEventFilter ? "w-[33%]" : "w-[50%]"
                  } mobilescreen:w-[100%]`}
                >
                  <BirthDateField
                    name="endDate"
                    label={t("COMMON.END.DATE")}
                    rmdpClassname="placeholder-primary-5 xs:pb-0"
                  />
                </div>
                {isEventFilter && (
                  <div className="block w-[33%] mobilescreen:w-[100%]">
                    <SelectInput
                      name="status"
                      label={t("COMMON.SELECT.STATUS")}
                      options={OpportunityStatus.map((g) => ({
                        label:
                          selectedLanguage === "ar" ? g.name_ar : g.name_en,
                        value: g.value,
                      }))}
                      onChange={(selectedOption) =>
                        setFieldValue("status", selectedOption?.value || "")
                      }
                    />
                  </div>
                )}
              </div>
            ) : (
              // Original layout when type is visible
              <>
                <div className="flex gap-2 xss:block">
                  <BirthDateField
                    name="startDate"
                    label={t("COMMON.START.DATE")}
                    rmdpClassname="placeholder-primary-5 xs:pb-0"
                  />
                  <BirthDateField
                    name="endDate"
                    label={t("COMMON.END.DATE")}
                    rmdpClassname="placeholder-primary-5 xs:pb-0"
                  />
                </div>

                <div className="flex mobilescreen:block gap-2 xs:block selectfiled">
                  <div
                    className={`block ${
                      activeTab === "organized" ? "w-[100%]" : "w-[50%]"
                    } mobilescreen:w-[100%]`}
                  >
                    <SelectInput
                      name="opportunity_type"
                      label={t("COMMON.SELECT.TYPE")}
                      options={options}
                      onChange={(selectedOption) =>
                        setFieldValue(
                          "opportunity_type",
                          selectedOption?.value || ""
                        )
                      }
                    />
                  </div>
                  {activeTab !== "organized" && (
                    <div className="block w-[50%] mobilescreen:w-[100%]">
                      <SelectInput
                        name="opportunity_status"
                        label={t("COMMON.SELECT.STATUS")}
                        options={OpportunityStatus.map((g) => ({
                          label:
                            selectedLanguage === "ar" ? g.name_ar : g.name_en,
                          value: g.value,
                        }))}
                        onChange={(selectedOption) =>
                          setFieldValue(
                            "opportunity_status",
                            selectedOption?.value || ""
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              </>
            )}
            <div
              className={`modal_intrest_tag ${
                !type || isEventFilter ? "w-full" : ""
              }`}
            >
              <InterestTagsInput
                name="tags"
                label={t("COMMON.TAGS")}
                setFieldValue={setFieldValue}
                values={values.tags}
                setFieldTouched={setFieldTouched}
                errors={errors.tags}
                notTransparent={true}
                touched={touched.tags}
              />
            </div>
          </Form>
        </div>
      )}
    </Formik>
  );
}
