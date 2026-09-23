"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getOpportunityById } from "@/features/opportunities/services/opportunities";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import type { VolunteerOpportunityDetail } from "./types";

interface NotFoundError {
  response?: {
    status?: number;
    data?: { message_en?: string; message_ar?: string };
  };
}

/**
 * `GET /opportunities/{id}/details/`, plus the one side effect that belongs to
 * loading it: a 404 sends the visitor to `/404` with the backend's own reason.
 *
 * The token is part of the query key so signing in from the registration modal
 * refetches with auth applied — the payload is per-viewer (`is_registered`,
 * `relationship_tags`, `self_attendance` all change with who is asking).
 */
export function useVolunteerOpportunity(id: string) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const authToken = useAuthStore((s) => s.user?.auth_token);

  const query = useQuery({
    queryKey: ["volunteer-opportunity", id, Boolean(authToken)],
    queryFn: () => getOpportunityById(id, Boolean(authToken)),
    enabled: Boolean(id),
  });

  useEffect(() => {
    const error = query.error as NotFoundError | null;
    if (error?.response?.status !== 404) return;

    const body = error.response?.data;
    toast.error(
      (language === "ar" ? body?.message_ar : body?.message_en) ||
        t("COMMON.OPPORTUNITY_NOT_FOUND")
    );
    router.replace("/404");
  }, [query.error, language, t, router]);

  return {
    data: query.data?.data as VolunteerOpportunityDetail | undefined,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
