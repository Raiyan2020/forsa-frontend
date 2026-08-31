"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { requestEventDeletion } from "@/features/events/services/eventsApi";
import { toast } from "sonner";
import { useLanguageStore } from "@/store/languageStore";
import { useMutation } from "@tanstack/react-query";

interface DeleteEventModalProps {
  eventId: string;
  setOpenModal: () => void;
  refetch: () => void;
  eventTitle?: {
    title_en: string;
    title_ar: string;
  };
}

function DeleteEventModal({
  eventId,
  setOpenModal,
  refetch,
}: DeleteEventModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const { mutate: performDelete, isPending: deleteLoading } = useMutation({
    mutationFn: () => requestEventDeletion(eventId),
    onSuccess: (response) => {
      const successMessage = response?.msg || response?.message_en || response?.message_ar;
      toast.success(successMessage || t("COMMON.TOAST.DELETE_EVENT_SUCCESS"));
      setOpenModal();
      refetch();
    },
    onError: (err: any) => {
      const errorData = err?.response?.data;
      if (errorData?.errors && Object.keys(errorData.errors).length > 0) {
        const errors = errorData.errors;
        Object.keys(errors).forEach((key) => {
          const errorMessage = errors[key][selectedLanguage] || t("COMMON.TOAST.DELETE_EVENT_FAILED");
          toast.error(errorMessage);
        });
      } else if (errorData?.msg || errorData?.message_en || errorData?.message_ar) {
        toast.error(
          errorData?.msg ||
            errorData[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.DELETE_EVENT_FAILED")
        );
      } else {
        toast.error(t("COMMON.TOAST.DELETE_EVENT_FAILED"));
      }
    },
  });

  const handleDelete = () => {
    if (!eventId) return;
    performDelete();
  };

  return (
    <div className="md:w-[100%] rounded-lg bg-white filtermodal">
      <h2 className="text-center pb-10 text-lg">
        {t("COMMON.ARE_YOU_SURE_DELETE_VOLUNTEER_EVENT")}
      </h2>
      <div className="flex xss:flex-col justify-center w-full gap-5">
        <Button
          variant="primary"
          type="button"
          size="medium"
          onClick={handleDelete}
          disabled={deleteLoading}
          className="xss:!w-full"
        >
          {t("COMMON.CONFIRM")}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          type="button"
          onClick={() => setOpenModal()}
          disabled={deleteLoading}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </div>
  );
}

export default DeleteEventModal;
