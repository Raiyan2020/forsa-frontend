"use client";

import React, { Suspense } from "react";

import { Formik, Form, FormikHelpers } from "formik";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { changePasswordRequest } from "@/features/auth/api/authApi";
import { useRouter, useSearchParams } from "next/navigation";
import * as Yup from "yup";
import { YupRequiredString, YupStrongPassword } from "@/lib/schema";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

interface ResetPasswordProps {
  email?: string;
  token?: string;
  onClose?: () => void;
  onShowLogin?: () => void;
  isModal?: boolean;
}

function ResetPasswordPageComponent({ email: propEmail, token: propToken, onClose, onShowLogin, isModal }: ResetPasswordProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const email = propEmail || searchParams.get("email") || "";
  const token = propToken || searchParams.get("token") || "";

  const changePasswordMutation = useMutation({
    mutationFn: changePasswordRequest,
  });

  const initialValues = {
    password: "",
    confirmPassword: "",
  };

  const validationSchema = Yup.object({
    password: YupStrongPassword,
    confirmPassword: YupRequiredString.oneOf(
      [Yup.ref("password")],
      t("COMMON.PASSWORDS.MUST.MATCH")
    ),
  });

  const handleSubmit = async (
    values: typeof initialValues,
    { resetForm }: FormikHelpers<typeof initialValues>
  ) => {
    try {
      await changePasswordMutation.mutateAsync({
        password: values.password,
        token,
        email,
      });

      toast.success(t("COMMON.TOAST.PASSWORD_RESET_SUCCESSFUL"));
      resetForm();
      if (onClose && onShowLogin) {
        onClose();
        onShowLogin();
      } else {
        router.push(`/login?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData?.errors) {
        const errors = errorData.errors;
        Object.keys(errors).forEach((key) => {
          const errorMessage = errors[key][selectedLanguage] || t("COMMON.TOAST.PASSWORD_RESET_FAILED");
          toast.error(errorMessage);
        });
      } else {
        toast.error(t("COMMON.TOAST.PASSWORD_RESET_FAILED"));
      }
    }
  };

  const isLoading = changePasswordMutation.isPending;

  return (
    <div className={cn(!onClose && "border-t", "border-[#000]")}>
      <div className={`${isModal ? "" : "2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]"}`}>
        {!isModal && (
          <h2 className="2xl:pb-11 lg:pb-5 pb-5 text-center font-bold xs:text-[22px] xs:leading-[26px] text-[28px] leading-[48px] md:text-[32px] md:leading-[52px] lg:text-[30px] lg:leading-[60px] 2xl:text-[50px] xl:leading-[68.09px] tracking-[0px] text-[#29246D]">
            {t("COMMON.RESET_PASSWORD")}
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
                    name="password"
                    type="password"
                    label={t("COMMON.ENTER_NEW_PASSWORD")}
                  />
                  <Input
                    name="confirmPassword"
                    type="password"
                    label={t("COMMON.CONFIRM_NEW_PASSWORD")}
                  />

                  <Button
                    className="mx-auto mt-[25px]"
                    variant="primary"
                    size="medium"
                    type="submit"
                    disabled={isLoading}
                  >
                    {t("COMMON.SUBMIT")}
                  </Button>
                </Form>
                <p className="text-primary-5 text-center extrasmall:text-base font-[400] text-[20px] leading-[27.24px] pt-7">
                  {t("COMMON.PLEASE_ENTER_NEW_PASSWORD")}
                </p>
              </div>
            </div>
          )}
        </Formik>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageComponent />
    </Suspense>
  );
}
