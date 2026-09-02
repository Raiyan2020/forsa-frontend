"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getTeams, updateVolunteerRegistration } from "@/features/opportunities/services/registrations";
import { getRolesOfOpportunity } from "@/features/opportunities/services/roles";
import { useLanguageStore } from "@/store/languageStore";
import { Role, SelectOption, Team } from "../components/volunteerListHelpers";

interface UseTeamsAndRolesArgs {
  opportunityId: string | undefined;
  /** Called after a registration's team/role is successfully changed. */
  onUpdated: () => void | Promise<void>;
}

/**
 * Team and role dropdowns (and their menus' own pagination), plus the
 * registration PATCH that assigns a row to one of them.
 */
export function useTeamsAndRoles({ opportunityId, onUpdated }: UseTeamsAndRolesArgs) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const [teamPage, setTeamPage] = useState(1);
  const [rolePage, setRolePage] = useState(1);
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [updating, setUpdating] = useState<"team" | "role">("team");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateRegistrationMutation = useMutation({
    mutationFn: updateVolunteerRegistration,
  });

  const teamsQuery = useQuery({
    queryKey: ["teams", opportunityId, teamPage],
    queryFn: () =>
      getTeams({ opportunity_id: opportunityId, page: teamPage, limit: 10 }),
    enabled: Boolean(opportunityId),
  });

  const rolesQuery = useQuery({
    queryKey: ["opportunity-roles", opportunityId, rolePage],
    queryFn: () =>
      getRolesOfOpportunity({
        opportunity_id: opportunityId,
        page: rolePage,
        limit: 10,
      }),
    enabled: Boolean(opportunityId),
  });

  const teamsData = teamsQuery.data;
  const rolesData = rolesQuery.data;
  const teamsLoading = teamsQuery.isLoading;
  const rolesLoading = rolesQuery.isLoading;

  useEffect(() => {
    if (!teamsData?.data) return;
    setTeamsList((previous) => {
      const fresh = (teamsData.data as Team[]).filter(
        (team) => !previous.some((existing) => existing.id === team.id)
      );
      return fresh.length ? [...previous, ...fresh] : previous;
    });
  }, [teamsData]);

  useEffect(() => {
    if (!rolesData?.data) return;
    setRolesList((previous) => {
      const fresh = (rolesData.data as Role[]).filter(
        (role) => !previous.some((existing) => existing.id === role.id)
      );
      return fresh.length ? [...previous, ...fresh] : previous;
    });
  }, [rolesData]);

  const handleTeamMenuScroll = () => {
    if (
      !teamsLoading &&
      (teamsData?.meta?.pagination?.total_pages ?? 0) > teamPage
    ) {
      setTeamPage((previous) => previous + 1);
    }
  };

  const handleRoleMenuScroll = () => {
    if (
      !rolesLoading &&
      (rolesData?.meta?.pagination?.total_pages ?? 0) > rolePage
    ) {
      setRolePage((previous) => previous + 1);
    }
  };

  const teamsRefetch = async () => {
    setTeamsList([]);
    setTeamPage(1);
    await teamsQuery.refetch();
  };

  const rolesRefetch = async () => {
    setRolesList([]);
    setRolePage(1);
    await rolesQuery.refetch();
  };

  const teamOptions: SelectOption[] = teamsList.map((team) => ({
    label: String(team[`team_name_${selectedLanguage}`]),
    value: String(team.id),
  }));

  const roleOptions: SelectOption[] = [
    { label: t("COMMON.NOT_SELECTED"), value: "" },
    ...rolesList.map((role) => ({
      label: String(role[`role_name_${selectedLanguage}`]),
      value: String(role.id),
    })),
  ];

  const handleUpdate = async (
    id: string,
    type: "team" | "role",
    value: string | undefined
  ) => {
    try {
      setUpdatingId(id);
      setUpdating(type);
      await updateRegistrationMutation.mutateAsync({
        id,
        data: { registration: id, [type]: value },
      });
      await onUpdated();
      toast.success(t("COMMON.UPDATE_SUCCESS"));
    } catch (error: any) {
      const errors = error?.response?.data?.errors;
      if (errors) {
        Object.keys(errors).forEach((key) => {
          toast.error(errors[key][selectedLanguage] || t("COMMON.UPDATE_FAILED"));
        });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return {
    teamsList,
    rolesList,
    teamOptions,
    roleOptions,
    teamsLoading,
    rolesLoading,
    updating,
    updatingId,
    handleTeamMenuScroll,
    handleRoleMenuScroll,
    teamsRefetch,
    rolesRefetch,
    handleUpdate,
  };
}
