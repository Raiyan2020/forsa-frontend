"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { registerForLearnServeOpportunity } from "@/features/services/api";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";

export interface LearnServeRegistrationDetails {
  title_ar?: string;
  title_en?: string;
  start_date?: string;
  isInPerson?: boolean;
}

interface ConfirmRegistrationModalProps {
  opportunityId: string;
  setOpenForm: () => void;
  refetch: () => void;
  opportunityDetails: LearnServeRegistrationDetails;
}

/** Registration confirmation for a learn & serve opportunity without time slots. */
export default function ConfirmRegistrationModal({
  opportunityId,
  setOpenForm,
  refetch,
  opportunityDetails,
}: ConfirmRegistrationModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const registerMutation = useMutation({
    mutationFn: registerForLearnServeOpportunity,
  });

  const handleConfirm = async () => {
    if (!opportunityId) return;
    try {
      await registerMutation.mutateAsync({ opportunity: opportunityId });
      toast.success(t("COMMON.TOAST.REGISTRATION_SUCCESSFUL"));
      setNavState(NAV_STATE_KEYS.opportunityThankyou, {
        ...opportunityDetails,
        islearnserve: true,
      });
      setOpenForm();
      refetch();
      router.push("/register-now");
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
    <div className="md:w-[100%] rounded-lg bg-white filtermodal">
      <h2 className="text-center text-lg pb-10">
        {t("COMMON.ARE_YOU_SURE_REGISTER_LEARNSHARE_OPPORTUNITY")}
      </h2>
      <div className="flex xss:flex-col justify-center w-full gap-5">
        <Button
          variant="primary"
          type="button"
          size="medium"
          onClick={handleConfirm}
          disabled={registerMutation.isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CONFIRM")}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          type="button"
          onClick={() => setOpenForm()}
          disabled={registerMutation.isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </div>
  );
}
