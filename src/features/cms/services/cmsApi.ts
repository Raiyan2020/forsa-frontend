import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type { CmsPage, HomeCms } from "@/lib/api/cms";

/**
 * Client-side twin of `fetchHomeCms` in `lib/api/server.ts`. Server Components
 * should use that one; this exists for the client-rendered surfaces
 * (authenticated homepage, contact page) that cannot read ISR data.
 */
export const getHomeCms = () =>
  apiClient.get<ApiResponse<HomeCms>>("/home/").then((r) => r.data);

export const getCmsPages = () =>
  apiClient.get<ApiResponse<CmsPage[]>>("/pages/").then((r) => r.data);

export const getCmsPage = (slug: string) =>
  apiClient
    .get<ApiResponse<CmsPage>>(`/pages/${encodeURIComponent(slug)}/`)
    .then((r) => r.data);
