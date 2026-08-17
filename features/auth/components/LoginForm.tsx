"use client";

import React, { useEffect, useState } from "react";
import { Formik, Form, FormikHelpers } from "formik";
import Input from "@/components/ui/Input";
import CheckBox from "@/components/ui/CheckBox";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useGoogleLogin } from "@react-oauth/google";

import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { loginRequest, checkUserRequest, passSocialInfoRequest } from "@/features/auth/api/authApi";
import { getApiErrorMessages, getApiFieldErrors } from "@/lib/api/errors";
import { startLinkedinLogin } from "@/lib/auth/linkedin";
import { YupEmail, YupRequiredString } from "@/lib/schema";
import * as Yup from "yup";
import { handleGoogleLogin } from "@/lib/helpers";
import Loader from "@/components/ui/Loader";

export interface LoginFormProps {
  /** From `?user_type=` on the standalone page; drives where new social users land. */
  userType?: string | null;
  /** Where to go after a successful login on the standalone page. */
  returnTo?: string;
  /**
   * Modal mode. The opportunity pages host this form inside a Modal instead of
   * navigating to /login, so every "go to another page" branch becomes a
   * callback the host swaps its own modal content with.
   */
  isModal?: boolean;
  onClose?: () => void;
  onShowEmailVerification?: (email: string, otpType: string) => void;
  onShowRegistration?: () => void;
  onShowVolunteerMandateDetails?: (userData: any) => void;
  onShowForgotPassword?: () => void;
}

export default function LoginForm({
  userType = null,
  returnTo = "/",
  isModal = false,
  onClose,
  onShowEmailVerification,
  onShowRegistration,
  onShowVolunteerMandateDetails,
  onShowForgotPassword,
}: LoginFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const selectedLanguage = useLanguageStore((s) => s.language);

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

      if (isModal) {
        onClose?.();
      } else {
        router.push(returnTo);
      }
    } catch (err: any) {
      const fieldErrors = getApiFieldErrors(err, selectedLanguage);
      const messages = Object.values(fieldErrors);
      // An unverified account is rejected at login; send it to the OTP step
      // instead of a dead-end toast.
      const isInactive = messages.some((message) =>
        /is not active|غير مفع|غير نشط/i.test(message)
      );

      if (isInactive) {
        toast.error(t("COMMON.TOAST.USER_NOT_ACTIVE"));
        if (isModal && onShowEmailVerification) {
          onClose?.();
          onShowEmailVerification(values.email || "", "register");
        } else {
          router.push(`/email-verification?email=${encodeURIComponent(values.email)}&otp_type=register`);
        }
      } else if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.TOAST.LOGIN_FAILED"));
      }
      console.error("Login failed:", err);
    }
  };

  /**
   * A social login for an unknown email needs the mandate/details step. On the
   * standalone page that is a route; in a modal the host swaps the body.
   */
  const routeNewSocialUser = (userData: any) => {
    if (isModal && onShowVolunteerMandateDetails) {
      onClose?.();
      onShowVolunteerMandateDetails(userData);
      return;
    }
    sessionStorage.setItem("oauth_user", JSON.stringify(userData));
    if (userType === "volunteer") {
      router.push("/volunteer-mandate-details");
    } else if (userType === "organization") {
      router.push("/complete-details");
    } else {
      router.push("/joinus");
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
          routeNewSocialUser(userData);
          return;
        }

        const finalUserData: any = {
          ...userData,
          user_type: isModal ? userType || "volunteer" : null,
          social_media_provider: "google",
        };

        const response = await passSocialInfoMutation.mutateAsync(finalUserData);
        const userDataToStore = response.data;
        setUser(userDataToStore);
        toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));
        if (isModal) {
          onClose?.();
        } else {
          router.push(returnTo);
        }
      } catch (err: any) {
        // social-auth rejects an email that already has a password account, and
        // a new volunteer without civil_id — both only make sense to the user as
        // the message the API sent.
        const messages = getApiErrorMessages(err, selectedLanguage);
        if (messages.length > 0) {
          messages.forEach((message) => toast.error(message));
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
    // Every LinkedIn sign-in lands on /linkedin-callback — the one URI the
    // Developer App has registered — and comes back here via the state payload:
    // an opportunity page hosting this form in a modal returns to
    // `original_path`, the standalone page to `returnTo`.
    setLinkedinLoading(true);
    const started = startLinkedinLogin({
      userType,
      returnTo: isModal ? undefined : returnTo,
      originalPath: isModal ? window.location.pathname : undefined,
    });
    if (!started) {
      setLinkedinLoading(false);
      toast.error(t("COMMON.TOAST.LINKEDIN_NOT_CONFIGURED"));
    }
  };

  /**
   * Signing in with an email and password reports itself inside the submit
   * button. The social paths keep the overlay: they hand the tab to Google or
   * LinkedIn, so the whole page really is blocked while they resolve.
   */
  const isSocialLoading =
    checkUserMutation.isPending ||
    passSocialInfoMutation.isPending ||
    linkedinLoading;

  const isLoading = loginMutation.isPending || isSocialLoading;

  const form = (
    <>
      {isSocialLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-white/50">
          <Loader />
        </div>
      )}
      {!isModal && (
        <h2 className="2xl:pb-11 lg:pb-5 pb-5 text-center font-bold text-[28px] 2xl:text-[50px] tracking-[0px] text-[#29246D]">
          {t("COMMON.LOGIN")}
        </h2>
      )}

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
                    {isModal ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          onShowForgotPassword?.();
                        }}
                      >
                        {t("COMMON.FORGOT_PASSWORD")}
                      </button>
                    ) : (
                      <Link href="/forgot-password">
                        {t("COMMON.FORGOT_PASSWORD")}
                      </Link>
                    )}
                  </span>
                </div>
                <Button
                  className="mx-auto mt-[25px]"
                  variant="primary"
                  size="medium"
                  type="submit"
                  disabled={isLoading}
                  loading={loginMutation.isPending}
                >
                  {t("COMMON.LOGIN")}
                </Button>

                <div>
                  <p className="font-semibold text-[18px] xss:text-base leading-[24.51px] py-8 text-primary-5 flex items-center w-full before:flex-1 before:border-t before:border-primary-5 before:mr-4 after:flex-1 after:border-t after:border-primary-5 after:ml-4 rtl:gap-[20px]">
                    {isModal ? t("COMMON.OR.BY") : t("COMMON.SIGNINWITH")}
                  </p>
                </div>

                <div className="flex justify-center gap-[15px]">
                  <img
                    src="/assets/auth/goggle.svg"
                    alt="Google"
                    onClick={() => {
                      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
                        toast.error(t("COMMON.TOAST.GOOGLE_NOT_CONFIGURED"));
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
                  {isModal ? t("COMMON.DONT.HAVE.ACCOUNT") : t("COMMON.NO_ACCOUNT")}
                  {isModal ? (
                    <button
                      type="button"
                      onClick={onShowRegistration}
                      dir="rtl"
                      className="border-b-2 text-primary-504 border-b-primary-504 font-bold"
                    >
                      {t("COMMON.SIGN.UP")}
                    </button>
                  ) : (
                    <Link
                      href="/joinus"
                      dir="rtl"
                      className="border-b-2 pb-1 pt-1 text-primary-504 font-bold border-b-primary-504"
                    >
                      {t("COMMON.CREATE_ACCOUNT")}
                    </Link>
                  )}
                </p>
              </Form>
            </div>
          </div>
        )}
      </Formik>
    </>
  );

  if (isModal) {
    return (
      <div className="loguser">
        <div className="relative">{form}</div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] relative">
        {form}
      </div>
    </div>
  );
}
