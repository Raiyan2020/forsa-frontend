import apiClient from "@/lib/api/client";

export const getBannerImages = (placement?: "home" | "opportunities" | "development" | "events") =>
  apiClient
    .get("/banner-images/", { params: placement ? { placement } : undefined })
    .then((r) => r.data);
