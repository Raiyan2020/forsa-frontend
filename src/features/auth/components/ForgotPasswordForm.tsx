"use client";

import React from "react";

import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useMutation } from "@tanstack/react-query";
import { forgotPasswordRequest } from "@/features/auth/services/authApi";
import { YupEmail } from "@/lib/schema";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

export interface ForgotPasswordFormProps {
  onClose?: () => void;
  onShowEmailVerification?: (email: string, otp_type: string) => void;
  isModal?: boolean;
}

export default function ForgotPasswordForm({
  onShowEmailVerification,
  onClose,
  isModal,
}: ForgotPasswordFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const forgotPasswordMutation = useMutation({
    mutationFn: forgotPasswordRequest,
  });

  const initialValues = {
    email: "",
  };

  const validationSchema = Yup.object({
    email: YupEmail,
  });

  const handleSubmit = async (
    values: typeof initialValues,
    { resetForm }: FormikHelpers<typeof initialValues>
  ) => {
    try {
      const response = await forgotPasswordMutation.mutateAsync(values);
      toast.success(response?.msg || t("COMMON.TOAST.EMAIL_SENT_SUCCESSFULLY"));
      resetForm();
      if (onShowEmailVerification) {
        onShowEmailVerification(values.email || "", "password");
        onClose?.();
      } else {
        router.push(`/email-verification?email=${encodeURIComponent(values.email)}&otp_type=password`);
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
      const nonFieldErrors = errorData?.errors?.non_field_errors;
      const isNotActive =
        nonFieldErrors?.en?.includes("is not active") ||
        nonFieldErrors?.[0]?.includes("is not active") ||
        (typeof nonFieldErrors === "string" &&
          nonFieldErrors.includes("is not active"));

      if (isNotActive) {
        toast.error(t("COMMON.TOAST.USER_NOT_ACTIVE"));
        if (onClose && onShowEmailVerification) {
          onClose();
          onShowEmailVerification(values.email || "", "register");
        } else {
          router.push(`/email-verification?email=${encodeURIComponent(values.email)}&otp_type=register`);
        }
      } else if (errorData?.errors) {
        const errors = errorData.errors;
        Object.keys(errors).forEach((key) => {
          const errorMessage = errors[key][selectedLanguage] || t("COMMON.TOAST.EMAIL_SEND_FAILED");
          toast.error(errorMessage);
        });
      } else {
        toast.error(t("COMMON.TOAST.EMAIL_SEND_FAILED"));
      }
    }
  };

  const isLoading = forgotPasswordMutation.isPending;

  return (
    <div className={cn(!onClose && "border-t", "border-[#000]")}>
      <div className={`${isModal ? "" : "2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]"}`}>
        {!isModal && (
          <h2 className="2xl:pb-11 lg:pb-5 pb-5 text-center font-bold xs:text-[22px] xs:leading-[26px] text-[28px] leading-[48px] md:text-[32px] md:leading-[52px] lg:text-[30px] lg:leading-[60px] 2xl:text-[50px] xl:leading-[68.09px] tracking-[0px] text-[#29246D]">
            {t("COMMON.FORGOT_PASSWORD")}
          </h2>
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {() => (
            <div className="flex justify-center">
              <div className="w-[90%] 2xl:w-[658px] lg:w-[658px] md:w-[90%] rounded-lg bg-white">
                <Form>
                  <Input
                    name="email"
                    type="email"
                    label={t("COMMON.ENTER_EMAIL")}
                  />

                  <Button
                    className="mx-auto mt-[25px]"
                    variant="primary"
                    size="medium"
                    type="submit"
                    disabled={isLoading}
                  >
                    {t("COMMON.SEND")}
                  </Button>
                </Form>
                <p className="text-primary-5 text-center extrasmall:text-base font-[400] text-[20px] leading-[27.24px] pt-7">
                  {t("COMMON.FORGOT_PASSWORD_INSTRUCTION")}
                </p>
              </div>
            </div>
          )}
        </Formik>
      </div>
    </div>
  );
}
