"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import { requestOpportunityDeletion } from "@/features/services/api";
import { toast } from "sonner";
import { useLanguageStore } from "@/store/languageStore";

interface DeleteOpportunityModalProps {
  opportunityId: string;
  type: "volunteer" | "learnserve";
  setOpenModal: () => void;
  refetch: () => void;
  opportunityTitle?: {
    title_en: string;
    title_ar: string;
  };
}

export default function DeleteOpportunityModal({
  opportunityId,
  type,
  setOpenModal,
  refetch,
}: DeleteOpportunityModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!opportunityId) return;
    setDeleteLoading(true);
    try {
      const response = await requestOpportunityDeletion({ id: opportunityId, type });
      const successMessage = response?.message_en || response?.message_ar;
      toast.success(successMessage || t("COMMON.TOAST.DELETE_OPPORTUNITY_SUCCESS"));
      setOpenModal();
      refetch();
    } catch (err: any) {
      const responseData = err?.response?.data;
      if (responseData?.errors && Object.keys(responseData.errors).length > 0) {
        const errors = responseData.errors;
        Object.keys(errors).forEach((key) => {
          const errorMessage =
            errors[key][selectedLanguage] || t("COMMON.TOAST.DELETE_OPPORTUNITY_FAILED");
          toast.error(errorMessage);
        });
      } else if (responseData?.message_en || responseData?.message_ar) {
        toast.error(
          responseData?.[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.DELETE_OPPORTUNITY_FAILED")
        );
      } else {
        toast.error(t("COMMON.TOAST.DELETE_OPPORTUNITY_FAILED"));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="md:w-[100%] rounded-lg bg-white filtermodal">
      <h2 className="text-center pb-10 text-lg">
        {type === "volunteer"
          ? t("COMMON.ARE_YOU_SURE_DELETE_VOLUNTEER_OPPORTUNITY")
          : t("COMMON.ARE_YOU_SURE_DELETE_LEARNSHARE_OPPORTUNITY")}
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
          onClick={setOpenModal}
          disabled={deleteLoading}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </div>
  );
}
