"use client";

import { useEffect, useState } from "react";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import Input from "@/components/ui/Input";
import SelectInput from "@/components/ui/SelectInput";
import {
  getRolesOfOpportunity,
  registerForVolunteerOpportunity,
} from "@/features/services/api";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";

export interface OpportunityRegistrationDetails {
  title_ar?: string;
  title_en?: string;
  start_date?: string;
}

interface VolunteerRegisterRoleModalProps {
  opportunityId: string;
  organizationId?: string;
  onLoadingChange: (isLoading: boolean) => void;
  onClose: () => void;
  opportunityDetails: OpportunityRegistrationDetails;
}

interface Role {
  id: string;
  role_name_en: string;
  role_name_ar: string;
  remaining_slots: number;
  instructions_en: string;
  instructions_ar: string;
  [key: string]: string | number;
}

interface RoleOption {
  label: string;
  value: string;
  remaining_slots?: number;
  instructions?: string;
}

export default function VolunteerRegisterRoleModal({
  opportunityId,
  organizationId,
  onLoadingChange,
  onClose,
  opportunityDetails,
}: VolunteerRegisterRoleModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  // Roles arrive a page at a time and accumulate as the menu is scrolled
  const [rolesList, setRolesList] = useState<Role[]>([]);

  const registerMutation = useMutation({
    mutationFn: registerForVolunteerOpportunity,
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["opportunity-roles", opportunityId, currentPage],
    queryFn: () =>
      getRolesOfOpportunity({
        opportunity_id: opportunityId,
        page: currentPage,
        limit: 10,
      }),
    enabled: Boolean(opportunityId),
  });

  useEffect(() => {
    onLoadingChange?.(registerMutation.isPending);
  }, [registerMutation.isPending, onLoadingChange]);

  useEffect(() => {
    if (!rolesData?.data) return;
    setRolesList((previous) => {
      const fresh = (rolesData.data as Role[]).filter(
        (role) => !previous.some((existing) => existing.id === role.id)
      );
      return fresh.length ? [...previous, ...fresh] : previous;
    });
  }, [rolesData]);

  const handleMenuScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    if (
      target.scrollHeight - target.scrollTop === target.clientHeight &&
      !rolesLoading
    ) {
      setCurrentPage((previous) => previous + 1);
    }
  };

  const roleOptions: RoleOption[] = rolesList.map((role) => ({
    label: String(role[`role_name_${selectedLanguage}`]),
    value: String(role.id),
    remaining_slots: role.remaining_slots,
    instructions: String(role[`instructions_${selectedLanguage}`]),
  }));

  const validationSchema = Yup.object().shape({
    role: Yup.string().required(t("COMMON.REQUIRED.FIELD")),
  });

  const handleSubmit = async (values: { role: string }) => {
    try {
      await registerMutation.mutateAsync({
        ...(organizationId ? { organization_id: organizationId } : {}),
        opportunity_id: opportunityId,
        role_id: values.role,
      });

      toast.success(t("COMMON.TOAST.REGISTRATION_SUCCESSFUL"));
      setNavState(NAV_STATE_KEYS.opportunityThankyou, opportunityDetails);
      router.push("/register-now");
      onClose();
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.errors && Object.keys(data.errors).length > 0) {
        Object.keys(data.errors).forEach((key) => {
          toast.error(
            data.errors[key][selectedLanguage] ||
              t("COMMON.TOAST.REGISTRATION_FAILED")
          );
        });
      } else if (data?.message_en || data?.message_ar) {
        toast.error(
          data[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.REGISTRATION_FAILED")
        );
      } else {
        toast.error(t("COMMON.TOAST.REGISTRATION_FAILED"));
      }
    }
  };

  return (
    <Formik
      initialValues={{ role: "" }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ setFieldValue }) => (
        <div className="md:w-[100%] rounded-lg bg-white pb-[20px] filtermodal">
          <Form>
            <div className="flex mobilescreen:flex-col gap-[50px] mobilescreen:gap-[0px] relative">
              <div className="w-1/3 mobilescreen:w-full">
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-3 mobilescreen:pb-1">
                  {t("COMMON.CHOOSE.YOUR.ROLE")}
                </p>
                <div className="space-y-0 flex gap-4 items-center xsmall:flex-col selectfiled">
                  <SelectInput
                    name="role"
                    label={t("COMMON.SELECT.ROLE")}
                    options={roleOptions}
                    onMenuScrollToBottom={handleMenuScroll}
                    disabled={rolesLoading}
                    onChange={(option) => {
                      setFieldValue("role", option?.value || "");
                      setSelectedRole(
                        (option as RoleOption | null) ?? null
                      );
                    }}
                  />
                </div>
              </div>

              <div className="selectfiled w-1/4 mobilescreen:w-full">
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-3 mobilescreen:pb-1">
                  {t("COMMON.REMAINING")}
                </p>
                <Input
                  name="remaining"
                  type="text"
                  placeholder=""
                  readOnly
                  value={selectedRole?.remaining_slots || 0}
                />
              </div>
            </div>
            {selectedRole?.instructions && (
              <div>
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-2 mobilescreen:pb-0">
                  {t("COMMON.INSTRUCTION")}
                </p>
                <p className="text-[#181822CC]/80 text-lg">
                  {selectedRole.instructions}
                </p>
              </div>
            )}
          </Form>
        </div>
      )}
    </Formik>
  );
}
