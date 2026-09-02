"use client";

import { Form, Formik, FormikHelpers } from "formik";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import ModalInput from "@/components/ui/ModalInput";
import { createTeam, getTeamById, updateTeam } from "@/features/opportunities/services/registrations";
import { YupRequiredString, YupStringMaxLength } from "@/features/shared/schemas";
import { getApiErrorMessages } from "@/lib/api/errors";
import { useLanguageStore } from "@/store/languageStore";

interface TeamFormValues {
  team_name_ar: string;
  team_name_en: string;
}

interface CreateTeamModalProps {
  opportunityId: string;
  teamId?: string;
  setOpenForm: () => void;
  refetch: () => void;
  dropdownRefetch?: () => void;
}

export default function CreateTeam({
  setOpenForm,
  opportunityId,
  refetch,
  dropdownRefetch,
  teamId,
}: CreateTeamModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const createTeamMutation = useMutation({ mutationFn: createTeam });
  const updateTeamMutation = useMutation({ mutationFn: updateTeam });

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => getTeamById(teamId as string),
    enabled: Boolean(teamId),
  });

  const isLoading =
    createTeamMutation.isPending || updateTeamMutation.isPending;

  const initialValues: TeamFormValues = {
    team_name_ar: teamData?.data?.team_name_ar || "",
    team_name_en: teamData?.data?.team_name_en || "",
  };

  const validationSchema = Yup.object({
    team_name_ar: YupStringMaxLength(100).concat(YupRequiredString),
    team_name_en: YupStringMaxLength(100).concat(YupRequiredString),
  });

  const handleSubmit = async (
    values: TeamFormValues,
    { resetForm }: FormikHelpers<TeamFormValues>
  ) => {
    try {
      const payload = {
        team_name_ar: values.team_name_ar,
        team_name_en: values.team_name_en,
        opportunity_id: opportunityId,
      };

      if (teamId) {
        await updateTeamMutation.mutateAsync({ id: teamId, data: payload });
        toast.success(t("COMMON.TOAST.UPDATE_TEAM_SUCCESS"));
      } else {
        await createTeamMutation.mutateAsync(payload);
        toast.success(t("COMMON.TOAST.CREATE_TEAM_SUCCESS"));
      }

      resetForm();
      setOpenForm();
      refetch();
      dropdownRefetch?.();
    } catch (error) {
      const messages = getApiErrorMessages(error, selectedLanguage);
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.TOAST.CREATE_TEAM_FAILED"));
      }
    }
  };

  if (teamLoading) {
    return <Loader />;
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ dirty }) => (
        <Form>
          <div>
            <ModalInput
              name="team_name_ar"
              placeholder={t("TEAM.ENTER_TEAM_NAME_AR")}
              type="text"
            />
          </div>
          <div>
            <ModalInput
              name="team_name_en"
              placeholder={t("TEAM.ENTER_TEAM_NAME_EN")}
              type="text"
            />
          </div>
          <div className="flex xss:flex-col justify-center w-full gap-5 pt-5">
            <Button
              variant="primary"
              type="submit"
              size="medium"
              disabled={isLoading || (!!teamId && !dirty)}
              className="xss:!w-full"
            >
              {t("COMMON.SAVE")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              type="button"
              className="xss:!w-full"
              disabled={isLoading}
              onClick={() => setOpenForm()}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
