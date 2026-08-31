"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { deleteTeam } from "@/features/opportunities/services/registrations";
import { useLanguageStore } from "@/store/languageStore";

interface DeleteTeamModalProps {
  teamId: string;
  setOpenDeleteModal: () => void;
  refetch: () => void;
  dropdownRefetch?: () => void;
  teamName?: Record<string, any>;
}

export default function DeleteTeam({
  teamId,
  setOpenDeleteModal,
  refetch,
  dropdownRefetch,
  teamName,
}: DeleteTeamModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const deleteTeamMutation = useMutation({ mutationFn: deleteTeam });

  const handleDelete = async () => {
    if (!teamId) return;
    try {
      await deleteTeamMutation.mutateAsync(teamId);
      toast.success(t("COMMON.TOAST.DELETE_TEAM_SUCCESS"));
      setOpenDeleteModal();
      refetch();
      dropdownRefetch?.();
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.errors && Object.keys(data.errors).length > 0) {
        Object.keys(data.errors).forEach((key) => {
          toast.error(
            data.errors[key][selectedLanguage] ||
              t("COMMON.TOAST.DELETE_TEAM_FAILED")
          );
        });
      } else if (data?.message_en || data?.message_ar) {
        toast.error(
          data[`message_${selectedLanguage}`] ||
            t("COMMON.TOAST.DELETE_TEAM_FAILED")
        );
      } else {
        toast.error(t("COMMON.TOAST.DELETE_TEAM_FAILED"));
      }
    }
  };

  return (
    <div className="md:w-[100%] rounded-lg bg-white filtermodal">
      <h2 className="text-center text-lg pb-10">
        {t("COMMON.ARE_YOU_SURE_DELETE_TEAM", {
          team:
            teamName?.[`team_name_${selectedLanguage}`] || t("COMMON.TEAM"),
        })}
      </h2>
      <div className="flex xss:flex-col justify-center w-full gap-5">
        <Button
          variant="primary"
          type="button"
          size="medium"
          onClick={handleDelete}
          disabled={deleteTeamMutation.isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CONFIRM")}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          type="button"
          onClick={() => setOpenDeleteModal()}
          disabled={deleteTeamMutation.isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </div>
  );
}
