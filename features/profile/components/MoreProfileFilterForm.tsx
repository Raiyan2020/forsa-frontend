"use client";

import { Formik, Form, useFormikContext } from "formik";
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
  onEmptyChange?: (isEmpty: boolean) => void;
  hideUserType?: boolean;
}

/**
 * Reports dirty/empty state from inside the Formik tree via context, rather
 * than calling `useEffect` directly in the render prop (not a valid hook
 * position — see `VolunteerFilterModal.tsx`'s `DirtyReporter` for the same
 * pattern).
 */
function FilterStateReporter({
  onDirtyChange,
  onEmptyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
}) {
  const { values, dirty } = useFormikContext<MoreProfileFilters>();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onEmptyChange?.(!values.name && !values.nickname && !values.user_type);
  }, [values, onEmptyChange]);

  return null;
}

function MoreProfileFilterForm({
  onApply,
  initialValues,
  onDirtyChange,
  onEmptyChange,
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
      {({ setFieldValue }) => {
        return (
          <div className="md:w-[100%] rounded-lg bg-white pb-[20px] xsl:pb-[36px] md:pb-[36px] xss:pb-[0px]">
            <Form>
              <FilterStateReporter
                onDirtyChange={onDirtyChange}
                onEmptyChange={onEmptyChange}
              />
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
