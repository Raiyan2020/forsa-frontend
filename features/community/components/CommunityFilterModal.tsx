"use client";

import { Formik, Form } from "formik";
import { TypeOfThoughts } from "@/data/Constants";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import SelectInput from "@/components/ui/SelectInput";
import { useLanguageStore } from "@/store/languageStore";
import BirthDateField from "@/components/ui/BirthDateField";
import { useEffect } from "react";
import * as Yup from "yup";
import { InterestTagsInput } from "@/components/ui/InterestTagsInput";

interface CommunityFilterModalProps {
  onApply: (filters: {
    name: string;
    startDate: string;
    endDate: string;
    type: string;
    tags?: string[];
  }) => void;
  initialValues?: CommunityFiltersData;
  onDirtyChange?: (dirty: boolean) => void;
}

export interface CommunityFiltersData {
  name: string;
  startDate: string;
  endDate: string;
  type: string;
  tags?: string[];
}

interface FormDirtyListenerProps {
  dirty: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

const FormDirtyListener = ({ dirty, onDirtyChange }: FormDirtyListenerProps) => {
  useEffect(() => {
    if (onDirtyChange) onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  return null;
};

function CommunityFilterModal({
  onApply,
  initialValues,
  onDirtyChange,
}: CommunityFilterModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

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

  const defaultValues: CommunityFiltersData = {
    name: "",
    startDate: "",
    endDate: "",
    type: "",
    tags: [],
  };

  return (
    <Formik
      initialValues={initialValues || defaultValues}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        onApply(values);
      }}
      enableReinitialize={true}
    >
      {({ values, setFieldTouched, errors, setFieldValue, dirty, touched }) => {
        return (
          <div className="md:w-[100%] rounded-lg bg-white filtermodal dropborder xss:pb-[20px] pb-[10px]">
            <FormDirtyListener dirty={dirty} onDirtyChange={onDirtyChange} />
            <Form className="community-modal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mobilescreen:gap-0 relative">
                <div>
                  <Input
                    name="name"
                    label={t("COMMON.ENTER.NAME")}
                    type="text"
                    customClass="custom-border-input"
                  />
                </div>
                <div className="selectfiled">
                  <SelectInput
                    name="type"
                    label={t("COMMON.SELECT.TYPE")}
                    options={TypeOfThoughts.map((g) => ({
                      label: selectedLanguage === "ar" ? g.name_ar : g.name_en,
                      value: g.value,
                    }))}
                    onChange={(selectedOption) =>
                      setFieldValue("type", selectedOption?.value || "")
                    }
                    isModal
                  />
                </div>
              </div>
              <div>
                <div className="flex xss:flex-col xss:gap-0 gap-6 daterange">
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
              <div className="mb-4 tags">
                <InterestTagsInput
                  name="tags"
                  label={t("COMMON.TAGS")}
                  setFieldValue={setFieldValue}
                  setFieldTouched={setFieldTouched}
                  values={values.tags}
                  errors={errors.tags}
                  touched={touched.tags}
                  notTransparent={true}
                />
              </div>
            </Form>
          </div>
        );
      }}
    </Formik>
  );
}

export default CommunityFilterModal;
