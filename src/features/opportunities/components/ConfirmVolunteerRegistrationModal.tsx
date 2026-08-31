"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { registerForVolunteerOpportunity } from "@/features/services/api";
import { getApiErrorMessage, isApiSuccess } from "@/lib/api/errors";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";
import type { OpportunityRegistrationDetails } from "./VolunteerRegisterRoleModal";

interface ConfirmVolunteerRegistrationModalProps {
  opportunityId: string;
  onClose: () => void;
  refetch: () => void;
  organizationId?: string;
  opportunityDetails: OpportunityRegistrationDetails;
}

/** Registration confirmation for opportunities that define no roles. */
export default function ConfirmVolunteerRegistrationModal({
  opportunityId,
  onClose,
  refetch,
  organizationId,
  opportunityDetails,
}: ConfirmVolunteerRegistrationModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const registerMutation = useMutation({
    mutationFn: registerForVolunteerOpportunity,
  });

  const handleConfirm = async () => {
    if (!opportunityId) return;
    try {
      const response = await registerMutation.mutateAsync({
        ...(organizationId ? { organization_id: organizationId } : {}),
        opportunity_id: opportunityId,
      });

      // The API also rejects with HTTP 200 + `key: "fail"`, so the envelope —
      // not the status — decides, and its `msg` is the reason to show
      // ("this opportunity is for a different age group", …).
      if (!isApiSuccess(response)) {
        toast.error(
          getApiErrorMessage(
            response,
            selectedLanguage,
            t("COMMON.TOAST.REGISTRATION_FAILED")
          )
        );
        return;
      }

      toast.success(t("COMMON.TOAST.REGISTRATION_SUCCESSFUL"));
      setNavState(NAV_STATE_KEYS.opportunityThankyou, opportunityDetails);
      router.push("/register-now");
      onClose();
      refetch();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          selectedLanguage,
          t("COMMON.TOAST.REGISTRATION_FAILED")
        )
      );
    }
  };

  return (
    <div className="md:w-[100%] rounded-lg bg-white filtermodal">
      <h2 className="text-center text-lg pb-10">
        {t("COMMON.ARE_YOU_SURE_REGISTER_VOLUNTEER_OPPORTUNITY")}
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
          onClick={onClose}
          disabled={registerMutation.isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </div>
  );
}
