"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

interface UpdateLearnServeConfirmModalProps {
  setOpenModal: () => void;
  onConfirm: () => Promise<void>;
  opportunityTitle?: {
    title_en: string;
    title_ar: string;
  };
}

export default function UpdateLearnServeConfirmModal({
  onConfirm,
  setOpenModal,
}: UpdateLearnServeConfirmModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      setOpenModal();
    } catch {
      // Error handling is managed by the parent component
      setIsLoading(false);
    }
  };

  return (
    <div className="md:w-[100%] rounded-lg bg-white filtermodal">
      <h2 className="text-center pb-10 text-lg">
        {t("COMMON.ARE_YOU_SURE_UPDATE_LEARNSERVE_OPPORTUNITY")}
      </h2>
      <div className="flex xss:flex-col justify-center w-full gap-5">
        <Button
          variant="primary"
          type="submit"
          size="medium"
          onClick={handleConfirm}
          disabled={isLoading}
          className="xss:!w-full"
        >
          {t("COMMON.CONFIRM")}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          type="button"
          onClick={() => setOpenModal()}
          disabled={isLoading}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </div>
  );
}
