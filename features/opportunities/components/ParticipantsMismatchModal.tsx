"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { deleteAllRoles } from "@/features/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface ParticipantsMismatchModalProps {
  id: number;
  onClose: () => void;
  roleModalClose?: () => void;
  refetch: () => void;
  stopNavigationBlock: () => void;
}

export default function ParticipantsMismatchModal({
  onClose,
  id,
  roleModalClose,
  refetch,
  stopNavigationBlock,
}: ParticipantsMismatchModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const deleteAllRolesMutation = useMutation({ mutationFn: deleteAllRoles });

  const handleDeleteAllRoles = async () => {
    try {
      await deleteAllRolesMutation.mutateAsync(id);
      refetch?.();
      toast.success(t("COMMON.TOAST.DELETE_ROLES_SUCCESS"));
      await stopNavigationBlock();

      // Small delay so the state updates settle before the modals unmount
      setTimeout(() => {
        onClose();
        roleModalClose?.();
      }, 500);
    } catch (error: any) {
      console.error("Error deleting all roles:", error);
      toast.error(
        error?.response?.data?.[`message_${selectedLanguage}`] ||
          t("COMMON.TOAST.DELETE_ROLES_FAILED")
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <p className="text-center pb-10 text-lg">
        {t("COMMON.CONFIRM_DELETE_ALL_ROLES")}
      </p>
      <div className="flex xss:flex-col justify-center w-full gap-5">
        <Button
          variant="primary"
          type="submit"
          size="medium"
          onClick={handleDeleteAllRoles}
          className="xss:!w-full"
        >
          {t("COMMON.CONFIRM")}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          type="button"
          onClick={onClose}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </div>
  );
}
