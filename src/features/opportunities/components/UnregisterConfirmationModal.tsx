"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { unregisterFromVolunteerOpportunity } from "@/features/opportunities/services/registrations";
import { useLanguageStore } from "@/store/languageStore";

interface UnregisterConfirmationModalProps {
  opportunityId: string;
  onClose: () => void;
  refetch: () => void;
}

export default function UnregisterConfirmationModal({
  opportunityId,
  onClose,
  refetch,
}: UnregisterConfirmationModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const unregisterMutation = useMutation({
    mutationFn: unregisterFromVolunteerOpportunity,
  });

  const handleConfirm = async () => {
    if (!opportunityId) return;
    try {
      await unregisterMutation.mutateAsync(opportunityId);
      toast.success(t("COMMON.TOAST.UNREGISTRATION_SUCCESSFUL"));
      onClose();
      refetch();
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.errors && Object.keys(data.errors).length > 0) {
        Object.keys(data.errors).forEach((key) => {
          toast.error(
            data.errors[key][selectedLanguage] ||
              t("COMMON.TOAST.UNREGISTRATION_FAILED")
          );
        });
      } else if (data?.message_en || data?.message_ar) {
        toast.error(
          data[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.UNREGISTRATION_FAILED")
        );
      } else {
        toast.error(t("COMMON.TOAST.UNREGISTRATION_FAILED"));
      }
    }
  };

  return (
    <div className="md:w-[100%] rounded-lg bg-white filtermodal">
      <p className="text-lg text-center pb-10">
        {t("COMMON.UNREGISTER_CONFIRMATION_MESSAGE")}
      </p>
      <div className="flex xss:flex-col justify-center w-full gap-5">
        <Button
          variant="primary"
          type="button"
          size="medium"
          onClick={handleConfirm}
          disabled={unregisterMutation.isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CONFIRM")}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          type="button"
          onClick={onClose}
          disabled={unregisterMutation.isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </div>
  );
}
