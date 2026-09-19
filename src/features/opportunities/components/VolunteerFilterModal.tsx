"use client";

import { useEffect, useState } from "react";
import { Form, Formik, useFormikContext } from "formik";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Select from "react-select";

import { getRolesOfOpportunity } from "@/features/opportunities/services/roles";
import { useLanguageStore } from "@/store/languageStore";

interface VolunteerFilterModalProps {
  opportunityId: string;
  onFilterChange: (filters: { roles?: string[] }) => void;
  currentFilters: { roles?: string[] };
  onDirtyChange?: (dirty: boolean) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
}

interface Role {
  id: string;
  role_name_en: string;
  role_name_ar: string;
  [key: string]: string | number;
}

interface SelectOption {
  label: string;
  value: string;
}

interface FormValues {
  roles: number[];
}

/**
 * The React original called `useEffect` inside the Formik render prop, which
 * isn't a valid hook position. The dirty/empty flags are reported from a
 * child instead.
 */
function DirtyReporter({
  onDirtyChange,
  onEmptyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
}) {
  const { dirty, values } = useFormikContext<FormValues>();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onEmptyChange?.(values.roles.length === 0);
  }, [values, onEmptyChange]);

  return null;
}

export default function VolunteerFilterModal({
  opportunityId,
  onFilterChange,
  currentFilters,
  onDirtyChange,
  onEmptyChange,
}: VolunteerFilterModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const [rolePage, setRolePage] = useState(1);
  const [rolesList, setRolesList] = useState<Role[]>([]);

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["opportunity-roles", opportunityId, rolePage],
    queryFn: () =>
      getRolesOfOpportunity({
        opportunity_id: opportunityId,
        page: rolePage,
        limit: 10,
      }),
    enabled: Boolean(opportunityId),
  });

  // Options accumulate across pages as the menus are scrolled
  useEffect(() => {
    if (!rolesData?.data) return;
    setRolesList((previous) => {
      const fresh = (rolesData.data as Role[]).filter(
        (role) => !previous.some((existing) => existing.id === role.id)
      );
      return fresh.length ? [...previous, ...fresh] : previous;
    });
  }, [rolesData]);

  const handleRoleMenuScroll = () => {
    if (!rolesLoading) setRolePage((previous) => previous + 1);
  };

  const roleOptions: SelectOption[] = rolesList.map((role) => ({
    label: String(role[`role_name_${selectedLanguage}`]),
    value: String(role.id),
  }));

  const customStyles = {
    multiValueRemove: (provided: any) => ({
      ...provided,
      ":hover": {
        backgroundColor: "transparent",
      },
    }),
  };

  return (
    <Formik<FormValues>
      initialValues={{
        roles: currentFilters.roles ? currentFilters.roles.map(Number) : [],
      }}
      onSubmit={(values) => {
        onFilterChange({
          roles: values.roles.length > 0 ? values.roles.map(String) : undefined,
        });
      }}
    >
      {({ setFieldValue, values }) => (
        <div className="md:w-[100%] rounded-lg bg-white pb-[20px] xss:pb-[30px] filtermodal">
          <Form>
            <DirtyReporter onDirtyChange={onDirtyChange} onEmptyChange={onEmptyChange} />
            {/* Single column now that teams are gone — one select in a
                two-column grid left a conspicuous empty half. */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 relative selectfiled">
              <div>
                <Select<SelectOption, true>
                  className="w-full"
                  options={roleOptions}
                  value={roleOptions.filter((option) =>
                    values.roles.includes(Number(option.value))
                  )}
                  onChange={(selectedOptions) =>
                    setFieldValue(
                      "roles",
                      selectedOptions
                        ? selectedOptions.map((option) => Number(option.value))
                        : []
                    )
                  }
                  onMenuScrollToBottom={handleRoleMenuScroll}
                  isLoading={rolesLoading}
                  isDisabled={rolesLoading}
                  placeholder={t("COMMON.SELECT.ROLE")}
                  isMulti
                  styles={customStyles}
                />
              </div>
            </div>
          </Form>
        </div>
      )}
    </Formik>
  );
}
