"use client";

import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import { Formik, Form, FormikHelpers } from "formik";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { emailVerificationRequest, resendOtpRequest } from "@/features/auth/api/authApi";
import { cn, maskEmail } from "@/lib/helpers";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/languageStore";

type OtpValues = {
  otp1: string;
  otp2: string;
  otp3: string;
  otp4: string;
  otp5: string;
  otp6: string;
};

const otpLength = 6;

export interface EmailVerificationFormProps {
  email?: string;
  otp_type?: string;
  onClose?: () => void;
  onShowLogin?: () => void;
  onShowResetPassword?: (email: string, token: string) => void;
  isModal?: boolean;
}

export default function EmailVerificationForm({
  email = "",
  otp_type = "",
  onClose,
  onShowLogin,
  onShowResetPassword,
  isModal,
}: EmailVerificationFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const verifyEmailMutation = useMutation({
    mutationFn: emailVerificationRequest,
  });

  const resendOtpMutation = useMutation({
    mutationFn: resendOtpRequest,
  });

  // Resend cooldown is capped at 1 minute regardless of the configured value.
  const initialTimer = Math.min(Number(process.env.NEXT_PUBLIC_OTP_TIMER) || 1800, 60);
  const [timer, setTimer] = useState(initialTimer);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [otpError, setOtpError] = useState<string | null>(null);

  const otpRefs = useRef<Array<HTMLInputElement | null>>(
    Array(otpLength).fill(null)
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setIsResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const initialValues: OtpValues = {
    otp1: "",
    otp2: "",
    otp3: "",
    otp4: "",
    otp5: "",
    otp6: "",
  };

  const handleOtpChange = (
    e: ChangeEvent<HTMLInputElement>,
    index: number,
    values: OtpValues,
    setFieldValue: (
      field: string,
      value: unknown,
      shouldValidate?: boolean
    ) => void
  ) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setFieldValue(`otp${index + 1}`, value);

    if (value && index < otpLength - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    const otpArray = Object.values({ ...values, [`otp${index + 1}`]: value });
    const isAnyFieldEmpty = otpArray.some((digit) => digit.trim() === "");
    setOtpError(isAnyFieldEmpty ? t("COMMON.PLEASE_ENTER_ALL_6_OTP_DIGITS") : null);
  };

  const handleOtpPaste = (
    e: ClipboardEvent<HTMLInputElement>,
    index: number,
    setFieldValue: (
      field: string,
      value: unknown,
      shouldValidate?: boolean
    ) => void
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, otpLength);

    if (pastedData) {
      [...pastedData].forEach((digit, i) => {
        if (i < otpLength) {
          setFieldValue(`otp${i + 1}`, digit);
        }
      });

      const nextIndex = Math.min(index + pastedData.length, otpLength - 1);
      otpRefs.current[nextIndex]?.focus();

      if (pastedData.length === otpLength) {
        setOtpError(null);
      } else {
        setOtpError(t("COMMON.PLEASE_ENTER_ALL_6_OTP_DIGITS"));
      }
    }
  };

  const handleBackspace = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
    setFieldValue: (field: string, value: unknown) => void
  ) => {
    if (
      e.key === "Backspace" &&
      !(e.target as HTMLInputElement).value &&
      index > 0
    ) {
      setFieldValue(`otp${index + 1}`, "");
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (
    values: OtpValues,
    { resetForm }: FormikHelpers<OtpValues>
  ) => {
    try {
      if (Object.values(values).some((digit) => digit.trim() === "")) {
        setOtpError(t("COMMON.ENTER_OTP"));
        return;
      }

      const otp = Object.values(values).join("");
      const response = await verifyEmailMutation.mutateAsync({
        otp,
        type: otp_type,
        email,
      });

      toast.success(t("COMMON.TOAST.EMAIL_VERIFIED_SUCCESSFULLY"));
      resetForm();
      setOtpError(null);
      onClose?.();

      if (otp_type === "register") {
        if (onShowLogin) {
          onShowLogin();
        } else {
          router.push("/login");
        }
      } else if (otp_type === "password") {
        if (onShowResetPassword) {
          onShowResetPassword(email, response.data.token);
        } else {
          router.push(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(response.data.token)}`);
        }
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        const errors = errorData.errors;
        Object.keys(errors).forEach((key) => {
          const errorMessage = errors[key][selectedLanguage] || t("COMMON.TOAST.EMAIL_VERIFICATION_FAILED");
          toast.error(errorMessage);
        });
      } else {
        toast.error(t("COMMON.TOAST.EMAIL_VERIFICATION_FAILED"));
      }
    }
  };

  const resendOtp = async () => {
    try {
      if (isResendDisabled) return;
      const response = await resendOtpMutation.mutateAsync({
        email,
        type: otp_type,
      });
      toast.success(response?.msg || t("COMMON.TOAST.OTP_RESENT_SUCCESSFULLY"));
      setTimer(initialTimer);
      setIsResendDisabled(true);
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        const errors = errorData.errors;
        Object.keys(errors).forEach((key) => {
          const errorMessage = errors[key][selectedLanguage] || t("COMMON.TOAST.OTP_RESENT_FAILED");
          toast.error(errorMessage);
        });
      } else {
        toast.error(t("COMMON.TOAST.OTP_RESENT_FAILED"));
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const isLoading = verifyEmailMutation.isPending;
  const isResendLoading = resendOtpMutation.isPending;

  return (
    <div className={cn(!onClose && "border-t", "border-[#000]")}>
      <div className={`${isModal ? "" : "2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]"}`}>
        <h2 className="2xl:pb-11 lg:pb-5 pb-5 text-center font-bold xs:text-[22px] xs:leading-[26px] text-[28px] leading-[48px] md:text-[32px] md:leading-[52px] lg:text-[30px] lg:leading-[60px] 2xl:text-[50px] xl:leading-[68.09px] tracking-[0px] text-[#29246D]">
          {isModal ? t("COMMON.ENTER.OTP") : t("COMMON.EMAIL_VERIFICATION")}
        </h2>

        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
          {({ setFieldValue, values }) => (
            <div className="flex justify-center">
              <div className="w-[90%] 2xl:w-[658px] lg:w-[658px] md:w-[90%] rounded-lg bg-white">
                <Form>
                  <div className="flex gap-3 justify-center" dir="ltr">
                    {[...Array(otpLength)].map((_, index) => (
                      <Input
                        key={index}
                        name={`otp${index + 1}`}
                        type="text"
                        maxLength={1}
                        dir="ltr"
                        ref={(el) => {
                          otpRefs.current[index] = el as any;
                        }}
                        onChange={(e) =>
                          handleOtpChange(e, index, values, setFieldValue)
                        }
                        onKeyDown={(e) =>
                          handleBackspace(e, index, setFieldValue)
                        }
                        onPaste={(e) => handleOtpPaste(e, index, setFieldValue)}
                        hideError
                        customClass="w-[50px] h-[50px] text-center text-xl"
                        className="text-center p-0"
                      />
                    ))}
                  </div>

                  {otpError && (
                    <div className="text-red-500 text-sm mt-2 text-center">
                      {otpError}
                    </div>
                  )}

                  <Button
                    className="mx-auto mt-[25px] w-[400px] mobilescreen:w-[200px]"
                    variant="primary"
                    size="medium"
                    type="submit"
                    disabled={isLoading}
                    loading={isLoading}
                  >
                    {t("COMMON.SUBMIT")}
                  </Button>

                  <p className="text-center pt-8 text-secondary-100 text-xl">
                    {formatTime(timer)}
                  </p>
                  <p
                    className={`text-center pt-1 text-[#29246D80] text-xl cursor-pointer ${isResendDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={resendOtp}
                  >
                    {isResendLoading
                      ? t("COMMON.SENDING_CODE")
                      : t("COMMON.RESEND_CODE")}
                  </p>
                </Form>
                <p className="pl-3 text-primary-5 extrasmall:text-base text-center text-[20px] pt-[30px]">
                  {t("COMMON.OTP_SENT")}
                  <span className="pl-3 text-primary-5">
                    {maskEmail(email)}
                  </span>
                </p>
              </div>
            </div>
          )}
        </Formik>
      </div>
    </div>
  );
}
