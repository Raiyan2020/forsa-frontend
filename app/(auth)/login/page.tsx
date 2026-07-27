"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Formik, Form, FormikHelpers } from "formik";
import Input from "@/components/ui/Input";
import CheckBox from "@/components/ui/CheckBox";
import Button from "@/components/ui/Button";
import Title from "@/components/shared/Title";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useGoogleLogin } from "@react-oauth/google";

import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { loginRequest, checkUserRequest, passSocialInfoRequest } from "@/features/auth/api/authApi";
import { API_BASE_URL } from "@/lib/api/config";
import { YupEmail, YupRequiredString } from "@/lib/schema";
import * as Yup from "yup";
import { handleGoogleLogin } from "@/lib/helpers";
import Loader from "@/components/ui/Loader";

function LoginPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const selectedLanguage = useLanguageStore((s) => s.language);

  const userType = searchParams.get("user_type") || null;
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo =
    requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/";
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const validationSchema = Yup.object({
    email: YupEmail,
    password: YupRequiredString,
  });

  // Load remembered credentials on mount
  useEffect(() => {
    const rememberedCredentials = localStorage.getItem("rememberedCredentials");
    if (rememberedCredentials) {
      const { email, password } = JSON.parse(rememberedCredentials);
      setInitialFormValues({
        email,
        password,
        rememberMe: true,
      });
    }
  }, []);

  // React Query mutations
  const loginMutation = useMutation({
    mutationFn: loginRequest,
  });

  const checkUserMutation = useMutation({
    mutationFn: checkUserRequest,
  });

  const passSocialInfoMutation = useMutation({
    mutationFn: passSocialInfoRequest,
  });

  const handleSubmit = async (
    values: any,
    { resetForm }: FormikHelpers<any>
  ) => {
    try {
      const response = await loginMutation.mutateAsync(values);
      const userData = response.data.data;

      // Store or remove credentials based on checkbox state
      if (values.rememberMe) {
        localStorage.setItem(
          "rememberedCredentials",
          JSON.stringify({
            email: values.email,
            password: values.password,
          })
        );
      } else {
        localStorage.removeItem("rememberedCredentials");
      }

      setUser(userData);
      toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));

      resetForm({
        values: {
          email: values.rememberMe ? values.email : "",
          password: "",
          rememberMe: values.rememberMe,
        },
      });

      router.push(returnTo);
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData?.errors?.non_field_errors?.en?.includes("is not active")) {
        toast.error(t("COMMON.TOAST.USER_NOT_ACTIVE"));
        router.push(`/email-verification?email=${encodeURIComponent(values.email)}&otp_type=register`);
      } else if (errorData?.errors) {
        const errors = errorData.errors;
        Object.keys(errors).forEach((key) => {
          const errorMessage =
            errors[key][selectedLanguage] || t("COMMON.TOAST.LOGIN_FAILED");
          toast.error(errorMessage);
        });
      } else {
        toast.error(t("COMMON.TOAST.LOGIN_FAILED"));
      }
      console.error("Login failed:", err);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const userData = await handleGoogleLogin(tokenResponse);
      if (!userData) return;

      try {
        const checkUserResponse = await checkUserMutation.mutateAsync({
          email: userData.email,
        });
        const isNewUser = checkUserResponse?.data?.email?.is_new_user;

        if (isNewUser) {
          toast.info(t("COMMON.TOAST.WELCOME_NEW_USER"));
          sessionStorage.setItem("oauth_user", JSON.stringify(userData));
          if (userType === "volunteer") {
            router.push("/volunteer-mandate-details");
            return;
          } else if (userType === "organization") {
            router.push("/complete-details");
            return;
          } else if (userType === null) {
            router.push("/joinus");
            return;
          }
        }

        const finalUserData: any = {
          ...userData,
          user_type: null,
          social_media_provider: "google",
        };

        const response = await passSocialInfoMutation.mutateAsync(finalUserData);
        const userDataToStore = response.data;
        setUser(userDataToStore);
        toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));
        router.push(returnTo);
      } catch (err: any) {
        const errorData = err?.response?.data;
        if (errorData?.errors?.email) {
          toast.error(t("COMMON.TOAST.EMAIL_ALREADY_EXISTS"));
        } else if (errorData?.errors) {
          const errors = errorData.errors;
          Object.keys(errors).forEach((key) => {
            const errorMessage =
              errors[key][selectedLanguage] ||
              t("COMMON.TOAST.REGISTRATION_FAILED");
            toast.error(errorMessage);
          });
        } else {
          toast.error(t("COMMON.TOAST.REGISTRATION_FAILED"));
        }
      }
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      toast.error(t("COMMON.TOAST.GOOGLE_LOGIN_ERROR"));
    },
  });

  const handleLinkedinLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
    const redirectUri = `${frontendUrl}/login`;
    const scope = "openid profile email w_member_social";
    const stateData = {
      user_type: userType,
      page_id: "login",
      random: Math.random().toString(36).substring(7),
      redirect_uri: redirectUri,
    };
    const state = btoa(JSON.stringify(stateData));

    const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scope)}&state=${state}`;

    window.location.href = linkedinAuthUrl;
  };

  const handleLinkedinCallback = async (
    code: string,
    userType: string | null,
    redirectUri: string
  ) => {
    setLinkedinLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/linkedin/callback/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        }
      );
      const data = await response.json();

      if (data?.key === "success" && data?.data?.access_token) {
        localStorage.setItem("access_token", data.data.access_token);

        const userData = data.data;
        userData.social_media_provider = "linkedin";
        userData.social_profile_pic_url = userData.picture;
        userData.social_media_id = userData.linkedin_id;

        const checkUserResponse = await checkUserMutation.mutateAsync({
          email: userData.email,
        });
        const isNewUser = checkUserResponse?.data?.email?.is_new_user;

        if (isNewUser) {
          toast.info(t("COMMON.TOAST.WELCOME_NEW_USER"));
          sessionStorage.setItem("oauth_user", JSON.stringify(userData));
          if (userType === "volunteer") {
            router.push("/volunteer-mandate-details");
            return;
          } else if (userType === "organization") {
            router.push("/complete-details");
            return;
          } else {
            router.push("/joinus");
            return;
          }
        }

        const finalUserData: any = {
          social_media_id: userData.linkedin_id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          social_profile_pic_url: userData.picture,
          access_token: data.data.access_token,
          user_type: null,
          social_media_provider: "linkedin",
        };

        const responseSocial = await passSocialInfoMutation.mutateAsync(finalUserData);
        const userDataToStore = responseSocial.data;
        setUser(userDataToStore);
        toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));
        router.push(returnTo);
      } else {
        toast.error(t("COMMON.TOAST.LINKEDIN_LOGIN_FAILED"));
      }
    } catch (error) {
      console.error("Error during LinkedIn login:", error);
      toast.error(t("COMMON.TOAST.LINKEDIN_LOGIN_ERROR"));
      router.push("/login");
    } finally {
      setLinkedinLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const stateParam = urlParams.get("state");

    if (code && stateParam) {
      try {
        const decodedState = JSON.parse(atob(stateParam));
        const { user_type, page_id, redirect_uri } = decodedState;

        if (page_id === "login") {
          handleLinkedinCallback(code, user_type, redirect_uri);
        }
      } catch (error) {
        console.error("Error parsing state parameter:", error);
        toast.error(t("COMMON.TOAST.INVALID_LINKEDIN_CALLBACK_STATE"));
        setLinkedinLoading(false);
      }
    }
  }, [searchParams]);

  const isLoading = loginMutation.isPending || checkUserMutation.isPending || passSocialInfoMutation.isPending || linkedinLoading;

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] relative">
        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-white/50">
            <Loader />
          </div>
        )}
        <h2 className="2xl:pb-11 lg:pb-5 pb-5 text-center font-bold text-[28px] 2xl:text-[50px] tracking-[0px] text-[#29246D]">
          {t("COMMON.LOGIN")}
        </h2>

        <Formik
          initialValues={initialFormValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize={true}
        >
          {({
            values,
            setFieldValue,
          }: {
            values: any;
            setFieldValue: (field: string, value: any) => void;
          }) => (
            <div className="flex justify-center">
              <div className="w-[90%] 2xl:w-[568px] lg:w-[568px] md:w-[90%] rounded-lg bg-white">
                <Form>
                  <Input
                    name="email"
                    type="text"
                    label={t("COMMON.EMAILPLACEHOLDER")}
                  />
                  <Input
                    name="password"
                    type="password"
                    label={t("COMMON.PASSWORDPLACEHOLDER")}
                  />
                  <div className="flex items-center mb-6 justify-between">
                    <CheckBox
                      id="rememberMe"
                      label={t("COMMON.KEEP_ME_LOGGED_IN")}
                      checked={values.rememberMe}
                      onChange={(checked) =>
                        setFieldValue("rememberMe", checked)
                      }
                    />
                    <span className="pt-[10px] extrasmall:text-xs text-end text-primary-504 border-b border-b-primary-504 pb-1 text-lg xss:text-base font-bold">
                      <Link href="/forgot-password">
                        {t("COMMON.FORGOT_PASSWORD")}
                      </Link>
                    </span>
                  </div>
                  <Button
                    className="mx-auto mt-[25px]"
                    variant="primary"
                    size="medium"
                    type="submit"
                    disabled={isLoading}
                  >
                    {t("COMMON.LOGIN")}
                  </Button>

                  <div>
                    <p className="font-semibold text-[18px] xss:text-base leading-[24.51px] py-8 text-primary-5 flex items-center w-full before:flex-1 before:border-t before:border-primary-5 before:mr-4 after:flex-1 after:border-t after:border-primary-5 after:ml-4 rtl:gap-[20px]">
                      {t("COMMON.SIGNINWITH")}
                    </p>
                  </div>
                  
                  <div className="flex justify-center gap-[15px]">
                    <img
                      src="/assets/auth/goggle.svg"
                      alt="Google"
                      onClick={() => {
                        if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
                          toast.error("Google Login is not configured.");
                          return;
                        }
                        googleLogin();
                      }}
                      className="cursor-pointer"
                    />
                    <img
                      src="/assets/auth/linkdin.svg"
                      alt="LinkedIn"
                      onClick={handleLinkedinLogin}
                      className="cursor-pointer"
                    />
                  </div>

                  <p className="items-center text-primary-5 text-center font-[400] text-[20px] leading-[27.24px] pt-7 xss:text-base gap-[10px] flex justify-center">
                    {t("COMMON.NO_ACCOUNT")}
                    <Link
                      href="/joinus"
                      dir="rtl"
                      className="border-b-2 pb-1 pt-1 text-primary-504 font-bold border-b-primary-504"
                    >
                      {t("COMMON.CREATE_ACCOUNT")}
                    </Link>
                  </p>
                </Form>
              </div>
            </div>
          )}
        </Formik>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginPageComponent />
    </Suspense>
  );
}
