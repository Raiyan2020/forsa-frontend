import apiClient from "@/lib/api/client";

// ─── Posts ───────────────────────────────────────────────────────────────────

export const getCommunityPosts = (params?: any) =>
  apiClient.get("/posts/", { params }).then((r) => r.data);

export const getCommunityPostsByTag = ({
  tag,
  page = 1,
  limit = 5,
}: {
  tag: string;
  page?: number;
  limit?: number;
}) =>
  apiClient
    .get("/posts/by_tag/", { params: { tag, page, limit } })
    .then((r) => r.data);

export const getCommunityPostById = (id: string) =>
  apiClient.get(`/posts/${id}/`).then((r) => r.data);

export const createCommunityPost = (data: any) =>
  apiClient.post("/posts/", data).then((r) => r.data);

export const updateCommunityPost = ({ id, data }: { id: string; data: any }) =>
  apiClient.patch(`/posts/${id}/`, data).then((r) => r.data);

export const deleteCommunityPost = (id: string) =>
  apiClient.delete(`/posts/${id}/`).then((r) => r.data);

// ─── Replies ─────────────────────────────────────────────────────────────────

export const getCommunityReplies = (postId: string) =>
  apiClient.get("/replies/", { params: { post_id: postId } }).then((r) => r.data);

export const createCommunityReply = (data: FormData) =>
  apiClient.post("/replies/", data).then((r) => r.data);

export const updateReply = ({ id, formData }: { id: string; formData: FormData }) =>
  apiClient.patch(`/replies/${id}/`, formData).then((r) => r.data);

export const getReplyById = (id: string) =>
  apiClient.get(`/replies/${id}/`).then((r) => r.data);

export const deleteReply = (id: string) =>
  apiClient.delete(`/replies/${id}/`).then((r) => r.data);

/** Same toggle endpoint backs post likes and reply likes. */
export const likeCommunityPost = (data: {
  post_id?: string;
  reply_id?: string;
}) =>
  apiClient.post("/likes/toggle/", data).then((r) => r.data);

// ─── Contact creator ─────────────────────────────────────────────────────────

export const communityPostContactUs = (data: { post_id: string; message: string }) =>
  apiClient.post(`/posts/${data.post_id}/contact-creator/`, data).then((r) => r.data);
