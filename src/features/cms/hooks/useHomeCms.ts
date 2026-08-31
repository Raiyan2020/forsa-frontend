"use client";

/**
 * Client-side access to the admin-editable homepage payload.
 *
 * Server Components should call `fetchHomeCms` from `lib/api/server.ts`
 * instead — this hook exists for surfaces that only ever render on the client
 * (authenticated homepage, contact page). One shared query key means the
 * request is made once per session regardless of how many components read it.
 */
import { useQuery } from "@tanstack/react-query";
import { getHomeCms } from "@/features/cms/services/cmsApi";
import type { HomeCms } from "@/lib/api/cms";

export function useHomeCms({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: ["home-cms"],
    queryFn: async () => (await getHomeCms())?.data ?? null,
    staleTime: 60 * 1000,
    enabled,
  });

  return { cms: (data ?? null) as HomeCms | null, isLoading };
}
