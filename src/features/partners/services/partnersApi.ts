import apiClient from "@/lib/api/client";

export const getSponsors = () =>
  apiClient.get("/sponsors/").then((r) => r.data);

export const createSponsors = (formData: FormData) =>
  apiClient.post("/sponsors/", formData).then((r) => r.data);
