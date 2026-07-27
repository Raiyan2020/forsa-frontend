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

export const linkedinLoginRequest = async () => {
  const { data } = await apiClient.get("/linkedin/login/");
  return data;
};

export const getDropdownChoicesRequest = async (type: string) => {
  const { data } = await apiClient.get(`/choices/${type}/`);
  return data;
};
