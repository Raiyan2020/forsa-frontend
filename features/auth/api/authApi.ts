import apiClient from "@/lib/api/client";

export const loginRequest = async (credentials: any) => {
  const { data } = await apiClient.post("/login/", credentials);
  return data;
};

export const registerRequest = async (credentials: any) => {
  const { data } = await apiClient.post("/register/", credentials);
  return data;
};

export const forgotPasswordRequest = async (credentials: any) => {
  const { data } = await apiClient.post("/forgot-password/", credentials);
  return data;
};

export const emailVerificationRequest = async (credentials: any) => {
  const { data } = await apiClient.post("/verify_otp_or_token/", credentials);
  return data;
};

export const resendOtpRequest = async (credentials: any) => {
  const { data } = await apiClient.post("/resend_otp_or_token/", credentials);
  return data;
};

export const changePasswordRequest = async (credentials: any) => {
  const { data } = await apiClient.post("/change-password/", credentials);
  return data;
};

export const passSocialInfoRequest = async (credentials: any) => {
  const { data } = await apiClient.post("/social-auth/", credentials);
  return data;
};

export const checkUserRequest = async (credentials: any) => {
  const { data } = await apiClient.post("/check-user/", credentials);
  return data;
};

/**
 * Exchanges the `code` LinkedIn redirected back with for the member's profile.
 * `redirect_uri` must equal the one used in the authorize URL byte for byte —
 * LinkedIn re-validates it here.
 */
export const linkedinCallbackRequest = async (payload: {
  code: string;
  redirect_uri: string;
}) => {
  const { data } = await apiClient.post("/linkedin/callback/", payload);
  return data;
};

export const getDropdownChoicesRequest = async (type: string) => {
  const { data } = await apiClient.get(`/choices/${type}/`);
  return data;
};
