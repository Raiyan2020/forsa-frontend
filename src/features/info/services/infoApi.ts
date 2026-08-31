import apiClient from "@/lib/api/client";
import type { ApiResponse, FaqItem } from "@/lib/api/types";

export const getFaqs = (params?: { page?: number; limit?: number }) =>
  apiClient
    .get<ApiResponse<FaqItem[]>>("/faqs/", { params })
    .then((response) => response.data);

export const createContactUs = (data: any) =>
  apiClient.post("/contact-us/", data).then((r) => r.data);
