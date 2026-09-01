import apiClient from "@/lib/api/client";

export const getDropdownChoices = (type: string) =>
  apiClient.get(`/choices/${type}/`).then((r) => r.data);
