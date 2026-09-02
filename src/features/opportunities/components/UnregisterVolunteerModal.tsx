"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { directUnregisterVolunteer } from "@/features/opportunities/services/registrations";
import { useLanguageStore } from "@/store/languageStore";

interface UnregisterVolunteerModalProps {
  open: boolean;
  onClose: () => void;
  opportunityId: string | undefined;
  volunteerId: number | null;
  /** Called after the volunteer is successfully unregistered. */
  onUnregistered: () => void | Promise<void>;
}

/** Confirms removing a volunteer's registration from an opportunity. */
export default function UnregisterVolunteerModal({
  open,
  onClose,
  opportunityId,
  volunteerId,
  onUnregistered,
}: UnregisterVolunteerModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const unregisterVolunteersMutation = useMutation({
    mutationFn: directUnregisterVolunteer,
  });

  const handleDeleteVolunteer = async () => {
    if (!opportunityId || !volunteerId) return;

    try {
      await unregisterVolunteersMutation.mutateAsync({
        opportunity_id: opportunityId,
        user_ids: [volunteerId],
      });
      toast.success(t("COMMON.VOLUNTEER_REMOVED_SUCCESS"));
      onClose();
      await onUnregistered();
    } catch (error: any) {
      const data = error?.response?.data;
      toast.error(
        data?.[`message_${selectedLanguage}`] ||
          t("COMMON.VOLUNTEER_REMOVED_FAILED")
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !unregisterVolunteersMutation.isPending && onClose()}
      title={t("COMMON.UNREGISTER_VOLUNTEER")}
      size="sm"
      footer={
        <div className="flex xss:flex-col justify-center w-full gap-5">
          <Button
            variant="primary"
            size="medium"
            className="xss:!w-full"
            disabled={unregisterVolunteersMutation.isPending}
            onClick={handleDeleteVolunteer}
          >
            {t("COMMON.CONFIRM")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            className="xss:!w-full"
            onClick={onClose}
            disabled={unregisterVolunteersMutation.isPending}
          >
            {t("COMMON.CANCEL")}
          </Button>
        </div>
      }
    >
      <div className="pb-10 text-center text-lg">
        <p>{t("COMMON.DELETE_VOLUNTEER_CONFIRMATION")}</p>
      </div>
    </Modal>
  );
}
