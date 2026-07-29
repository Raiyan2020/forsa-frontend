"use client";

import { Form, Formik, FormikHelpers } from "formik";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import ModalInput from "@/components/ui/ModalInput";
import ModalTextarea from "@/components/ui/ModalTextarea";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import {
  createVolunteerOpportunityRole,
  getVolunteerOpportunityRoleById,
  updateVolunteerOpportunityRole,
} from "@/features/services/api";
import {
  YupNumberOnly,
  YupRequiredString,
  YupStringMaxLength,
} from "@/lib/schema";
import { useLanguageStore } from "@/store/languageStore";

interface RoleFormValues {
  role_name: string;
  instructions: string;
  participants_needed: string;
}

interface CreateRoleModalProps {
  oppurtunityId: string;
  roleId?: string;
  setOpenForm: () => void;
  refetch: () => void;
  dropdownRefetch?: () => void;
  participantsStillNeeded?: number;
}

export default function CreateVolunteerRoleModal({
  setOpenForm,
  oppurtunityId,
  refetch,
  dropdownRefetch,
  roleId,
  participantsStillNeeded = 0,
}: CreateRoleModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const createRoleMutation = useMutation({
    mutationFn: createVolunteerOpportunityRole,
  });
  const updateRoleMutation = useMutation({
    mutationFn: updateVolunteerOpportunityRole,
  });

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["volunteer-opportunity-role", roleId],
    queryFn: () => getVolunteerOpportunityRoleById(roleId as string),
    enabled: Boolean(roleId),
  });

  const initialValues: RoleFormValues = {
    role_name: roleData?.data?.[`role_name_${selectedLanguage}`] || "",
    instructions: roleData?.data?.[`instructions_${selectedLanguage}`] || "",
    participants_needed:
      roleData?.data?.participants_needed ||
      (roleId ? "" : String(participantsStillNeeded)),
  };

  const validationSchema = Yup.object({
    role_name: YupStringMaxLength(100).concat(YupRequiredString),
    instructions: Yup.string().concat(YupRequiredString),
    participants_needed: YupNumberOnly,
  });

  const handleSubmit = async (
    values: RoleFormValues,
    { resetForm }: FormikHelpers<RoleFormValues>
  ) => {
    try {
      const payload = {
        [`role_name_${selectedLanguage}`]: values.role_name,
        [`instructions_${selectedLanguage}`]: values.instructions,
        participants_needed: values.participants_needed,
        opportunity: oppurtunityId,
      };

      if (roleId) {
        await updateRoleMutation.mutateAsync({ id: roleId, data: payload });
        toast.success(t("COMMON.TOAST.UPDATE_OPPURTUNITY_ROLE_SUCCESS"));
      } else {
        await createRoleMutation.mutateAsync(payload);
        toast.success(t("COMMON.TOAST.CREATE_OPPURTUNITY_ROLE_SUCCESS"));
      }

      resetForm();
      setOpenForm();
      refetch();
      dropdownRefetch?.();
    } catch (err: any) {
      const payload = err?.response?.data;
      if (payload?.errors && Object.keys(payload.errors).length > 0) {
        Object.keys(payload.errors).forEach((key) => {
          toast.error(
            payload.errors[key][selectedLanguage] ||
              t("COMMON.TOAST.CREATE_OPPURTUNITY_ROLE_FAILED")
          );
        });
      } else if (payload?.message_en || payload?.message_ar) {
        toast.error(
          payload[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.CREATE_OPPURTUNITY_ROLE_FAILED")
        );
      } else {
        toast.error(t("COMMON.TOAST.CREATE_OPPURTUNITY_ROLE_FAILED"));
      }
    }
  };

  const submitLoading =
    createRoleMutation.isPending || updateRoleMutation.isPending;

  if (roleLoading) {
    return <Loader />;
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ dirty }) => (
        <div className="md:w-[100%] rounded-lg bg-white filtermodal">
          <Form>
            <div className="grid grid-cols-2 xss:grid-cols-1 xss:gap-0 md:grid-cols-2 gap-6 relative selectfiled">
              <div>
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-2 mobilescreen:pb-2">
                  {t("VOLUNTEER.ENTER_ROLE")}
                </p>
                <ModalInput
                  name="role_name"
                  type="text"
                  placeholder={t("VOLUNTEER.ENTER_ROLE")}
                />
              </div>
              <div className="lg:w-1/3 md:w-1/2 xss:w-full">
                <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-2 mobilescreen:pb-2">
                  {t("VOLUNTEER.NEEDED")}
                </p>
                <ModalInput
                  name="participants_needed"
                  type="text"
                  placeholder={t("COMMON.ENTER.NUMBER")}
                />
              </div>
            </div>
            <div>
              <p className="text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold pb-2 mobilescreen:pb-2">
                {t("VOLUNTEER.ENTER_INSTRUCTION")}
              </p>
              <ModalTextarea
                name="instructions"
                placeholder={t("VOLUNTEER.ENTER_INSTRUCTION")}
                className="ModalTextareaclr"
              />
            </div>
            <div className="flex xss:flex-col justify-center w-full gap-5 pt-4">
              <Button
                variant="primary"
                type="submit"
                size="medium"
                disabled={submitLoading || (!!roleId && !dirty)}
                className="xss:!w-full"
              >
                {t("COMMON.SAVE")}
              </Button>
              <Button
                variant="secondary"
                size="medium"
                type="button"
                className="xss:!w-full"
                disabled={submitLoading}
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
