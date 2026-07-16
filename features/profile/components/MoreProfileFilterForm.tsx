"use client";

import { Formik, Form } from "formik";
import { MoreProfileCategories } from "@/data/Constants";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/languageStore";
import SelectInput from "@/components/ui/SelectInput";
import Input from "@/components/ui/Input";
import { useEffect } from "react";

export interface MoreProfileFilters {
  name: string;
  nickname: string;
  user_type: string;
}

interface MoreProfileFilterFormProps {
  onApply: (filters: MoreProfileFilters) => void;
  initialValues: MoreProfileFilters;
  onDirtyChange?: (dirty: boolean) => void;
  hideUserType?: boolean;
}

function MoreProfileFilterForm({
  onApply,
  initialValues,
  onDirtyChange,
  hideUserType = false,
}: MoreProfileFilterFormProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={(values) => {
        onApply(values);
      }}
      enableReinitialize
    >
      {({ setFieldValue, dirty }) => {
        useEffect(() => {
          if (onDirtyChange) onDirtyChange(dirty);
        }, [dirty, onDirtyChange]);
        
        return (
          <div className="md:w-[100%] rounded-lg bg-white pb-[20px] xsl:pb-[36px] md:pb-[36px] xss:pb-[0px]">
            <Form>
              <div className={`grid grid-cols-1 gap-6 mobilescreen:gap-[0px] relative 2xl:pb-7 pb-4 ${hideUserType ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                <div>
                  <Input
                    name="name"
                    label={t("COMMON.ENTER.NAME")}
                    type="text"
                    customClass="custom-border-input"
                  />
                </div>
                <div>
                  <Input
                    name="nickname"
                    label={t("COMMON.NICKNAME")}
                    type="text"
                    customClass="custom-border-input"
                  />
                </div>
                {!hideUserType && (
                  <div>
                    <SelectInput
                      name="user_type"
                      label={t("COMMON.SELECT.TYPE")}
                      options={MoreProfileCategories.map((g) => ({
                        label: selectedLanguage === "ar" ? g.name_ar : g.name_en,
                        value: g.value,
                      }))}
                      onChange={(selectedOption) =>
                        setFieldValue("user_type", selectedOption?.value || "")
                      }
                      className="custom-select-input"
                    />
                  </div>
                )}
              </div>
            </Form>
          </div>
        );
      }}
    </Formik>
  );
}

export default MoreProfileFilterForm;
export type { MoreProfileFilterFormProps };
