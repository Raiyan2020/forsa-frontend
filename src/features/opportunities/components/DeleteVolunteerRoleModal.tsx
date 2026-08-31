"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { deleteVolunteerOpportunityRole } from "@/features/opportunities/services/roles";
import { useLanguageStore } from "@/store/languageStore";

interface DeleteRoleModalProps {
  roleId: string;
  setOpenForm: () => void;
  refetch: () => void;
  dropdownRefetch?: () => void;
}

export default function DeleteVolunteerRoleModal({
  roleId,
  setOpenForm,
  refetch,
  dropdownRefetch,
}: DeleteRoleModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const deleteRoleMutation = useMutation({
    mutationFn: deleteVolunteerOpportunityRole,
  });

  const handleDelete = async () => {
    if (!roleId) return;
    try {
      await deleteRoleMutation.mutateAsync(roleId);
      toast.success(t("COMMON.TOAST.DELETE_OPPURTUNITY_ROLE_SUCCESS"));
      setOpenForm();
      refetch();
      dropdownRefetch?.();
    } catch (err: any) {
      const payload = err?.response?.data;
      if (payload?.errors && Object.keys(payload.errors).length > 0) {
        Object.keys(payload.errors).forEach((key) => {
          toast.error(
            payload.errors[key][selectedLanguage] ||
              t("COMMON.TOAST.DELETE_OPPURTUNITY_ROLE_FAILED")
          );
        });
      } else if (payload?.message_en || payload?.message_ar) {
        toast.error(
          payload[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.DELETE_OPPURTUNITY_ROLE_FAILED")
        );
      } else {
        toast.error(t("COMMON.TOAST.DELETE_OPPURTUNITY_ROLE_FAILED"));
      }
    }
  };

  return (
    <div className="md:w-[100%] rounded-lg bg-white filtermodal">
      <h2 className="text-center text-lg pb-10">
        {t("COMMON.ARE_YOU_SURE_DELETE_ROLE")}
      </h2>
      <div className="flex xss:flex-col justify-center w-full gap-5">
        <Button
          variant="primary"
          type="submit"
          size="medium"
          onClick={handleDelete}
          disabled={deleteRoleMutation.isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CONFIRM")}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          type="button"
          onClick={() => setOpenForm()}
          disabled={deleteRoleMutation.isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </div>
  );
}
