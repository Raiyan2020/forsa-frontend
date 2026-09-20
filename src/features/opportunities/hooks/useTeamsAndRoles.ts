"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { updateVolunteerRegistration } from "@/features/opportunities/services/registrations";
import { getApiErrorMessages } from "@/lib/api/errors";
import { getRolesOfOpportunity } from "@/features/opportunities/services/roles";
import { useLanguageStore } from "@/store/languageStore";
import { Role, SelectOption } from "../components/volunteerListHelpers";

interface UseTeamsAndRolesArgs {
  opportunityId: string | undefined;
  /** Called after a registration's role is successfully changed. */
  onUpdated: () => void | Promise<void>;
}

/**
 * The role dropdown (and its menu's own pagination), plus the registration
 * PATCH that assigns a row to one.
 *
 * Teams are gone — the client dropped them from this screen entirely and roles
 * are the only grouping now. The hook kept its name because it is imported
 * under it, but it no longer fetches `/teams/`: that request ran on every load
 * of the volunteers list and nothing consumed its result. The `"team" | "role"`
 * union on `handleUpdate` survives because the API still accepts `team` on the
 * same PATCH and the mobile app and admin dashboard may still send it — we just
 * never do.
 */
export function useTeamsAndRoles({ opportunityId, onUpdated }: UseTeamsAndRolesArgs) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const [rolePage, setRolePage] = useState(1);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [updating, setUpdating] = useState<"team" | "role">("role");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateRegistrationMutation = useMutation({
    mutationFn: updateVolunteerRegistration,
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

  const rolesData = rolesQuery.data;
  const rolesLoading = rolesQuery.isLoading;

  useEffect(() => {
    if (!rolesData?.data) return;
    setRolesList((previous) => {
      const fresh = (rolesData.data as Role[]).filter(
        (role) => !previous.some((existing) => existing.id === role.id)
      );
      return fresh.length ? [...previous, ...fresh] : previous;
    });
  }, [rolesData]);

  const handleRoleMenuScroll = () => {
    if (
      !rolesLoading &&
      (rolesData?.meta?.pagination?.total_pages ?? 0) > rolePage
    ) {
      setRolePage((previous) => previous + 1);
    }
  };

  const rolesRefetch = async () => {
    setRolesList([]);
    setRolePage(1);
    await rolesQuery.refetch();
  };

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
    } catch (error: unknown) {
      // BE-67.5 returns the role-capacity refusal as a 422 with a `role` field
      // error under `response_status.validation_errors`. Reading
      // `data.errors[field][lang]` — the older envelope — missed it entirely and
      // failed silently, so the organizer saw the dropdown snap back with no
      // explanation. `getApiErrorMessages` reads both shapes and the backend
      // has already localized the text from the language header.
      const messages = getApiErrorMessages(error, selectedLanguage);
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.UPDATE_FAILED"));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return {
    rolesList,
    roleOptions,
    rolesLoading,
    updating,
    updatingId,
    handleRoleMenuScroll,
    rolesRefetch,
    handleUpdate,
  };
}
