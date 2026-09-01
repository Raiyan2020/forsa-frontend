import apiClient from "@/lib/api/client";

export const createOpportunityFeedback = (data: any) =>
  apiClient.post("/opportunity-feedbacks/", data).then((r) => r.data);

export const getOpportunityFeedbacks = (opportunity_id: string) =>
  apiClient.get("/opportunity-feedbacks/", { params: { opportunity_id } }).then((r) => r.data);

export const likeOpportunityFeedback = (feedback_id: string) =>
  apiClient.post(`/opportunity-feedback/${feedback_id}/like/`).then((r) => r.data);

export const updateOpportunityFeedback = ({ feedback_id, data }: { feedback_id: string; data: any }) =>
  apiClient.patch(`/opportunity-feedbacks/${feedback_id}/`, data).then((r) => r.data);

export const deleteOpportunityFeedback = (feedback_id: string) =>
  apiClient.delete(`/opportunity-feedbacks/${feedback_id}/`).then((r) => r.data);
