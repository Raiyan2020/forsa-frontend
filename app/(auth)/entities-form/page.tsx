"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { Formik, Form, FormikHelpers } from "formik";
import Input from "@/components/ui/Input";
import InlineSpinner from "@/components/ui/InlineSpinner";
import PhoneInput from "@/components/ui/PhoneInput";
import Button from "@/components/ui/Button";
import UploadInput from "@/components/ui/UploadInput";
import CheckBox from "@/components/ui/CheckBox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import * as Yup from "yup";

import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import {
  registerRequest,
  checkUserRequest,
  passSocialInfoRequest,
  getDropdownChoicesRequest,
} from "@/features/auth/api/authApi";
import { getApiErrorMessages, isApiSuccess } from "@/lib/api/errors";
import { startLinkedinLogin } from "@/lib/auth/linkedin";
import {
  SocialProfile,
  setSocialPrefill,
  socialOnboardingRoute,
  stashSocialProfile,
} from "@/lib/auth/socialSignup";
import {
  YupEmail,
  YupPhoneNumber,
  YupRequiredString,
  YupStringMaxLength,
  YupStrongPassword,
  YupDigitsOnlyOptional,
} from "@/lib/schema";
import { handleGoogleLogin } from "@/lib/helpers";
import dynamic from "next/dynamic";
const CountryCodeSelect = dynamic(
  () => import("@/components/ui/CountryCodeSelect"),
  { ssr: false, loading: () => <div className="h-[48px] rounded-2xl bg-gray-100 animate-pulse mb-4" /> }
);
import SelectInput from "@/components/ui/SelectInput";
import Loader from "@/components/ui/Loader";

function EntitiesAccountPageComponent() {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const setUser = useAuthStore((s) => s.setUser);

  const [linkedinLoading, setLinkedinLoading] = useState(false);

  const [nicknameAvailability, setNicknameAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: "",
  });
  const nicknameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // TanStack Query mutations
  const registerMutation = useMutation({
    mutationFn: registerRequest,
  });

  const checkUserMutation = useMutation({
    mutationFn: checkUserRequest,
  });

  const passSocialInfoMutation = useMutation({
    mutationFn: passSocialInfoRequest,
  });

  // Fetch choices
  const { data: orgTypeData, isLoading: orgTypeLoading } = useQuery({
    queryKey: ["org-type-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("org_type"),
    enabled: !!selectedLanguage,
  });

  const orgTypeOptions =
    orgTypeData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: String(item.id),
      rawValue: item.value_en,
    })) || [];

  const initialValues = {
    first_name: "",
    organizer_type: "",
    email: "",
    password: "",
    phone_number: "",
    country_code: "",
    documents: [] as File[],
    license_number: "",
    nickname: "",
    latitude: "",
    longitude: "",
    termsAccepted: false,
  };

  const validationSchema = Yup.object({
    first_name: YupStringMaxLength(100).concat(YupRequiredString),
    organizer_type: Yup.string().concat(YupRequiredString),
    license_number: YupDigitsOnlyOptional(100).when("organizer_type", (organizer_type: any, schema: any) => {
      const organizerTypeValue = Array.isArray(organizer_type) ? organizer_type[0] : organizer_type;
      const selected = orgTypeOptions.find((o: any) => String(o.value) === String(organizerTypeValue));
      const isPublic = selected?.rawValue === "Public";
      return isPublic ? schema.notRequired() : schema.required(t("COMMON.REQUIRED.FIELD"));
    }),
    nickname: YupStringMaxLength(50)
      .matches(/^[A-Za-z0-9._]+$/, t("COMMON.ENGLISH_ONLY"))
      .test("nickname-availability", t("COMMON.USERNAME_TAKEN"), function () {
        if (!this.parent.nickname) return true;
        return nicknameAvailability.available !== false;
      }),
    phone_number: YupPhoneNumber,
    country_code: Yup.string().concat(YupRequiredString),
    email: YupEmail,
    documents: Yup.array().test("fileSizeAndRequired", t("COMMON.FILE.TOO.LARGE"), function (files) {
      const organizer_type = this.parent?.organizer_type;
      const selected = orgTypeOptions.find((o: any) => String(o.value) === String(organizer_type));
      const isPublic = selected?.rawValue === "Public";

      if (isPublic) {
        if (!files || files.length === 0) return true;
        return files.every((file: any) => file instanceof File && file.size <= 2 * 1024 * 1024);
      }

      if (!files || files.length === 0) {
        return this.createError({ message: t("COMMON.REQUIRED.FIELD") || "Required field" });
      }
      return files.every((file: any) => file instanceof File && file.size <= 2 * 1024 * 1024);
    }),
    password: YupStrongPassword,
    termsAccepted: Yup.boolean()
      .required(t("COMMON.REQUIRED.FIELD"))
      .oneOf([true], t("COMMON.TERMS_ACCEPTANCE_REQUIRED")),
  });

  const checkNicknameAvailability = useCallback(
    async (nickname: string) => {
      if (nicknameCheckTimeoutRef.current) {
        clearTimeout(nicknameCheckTimeoutRef.current);
      }

      if (!nickname || nickname.trim() === "") {
        setNicknameAvailability({
          checking: false,
          available: null,
          message: "",
        });
        return;
      }

      const nicknameRegex = /^[A-Za-z0-9._]+$/;
      if (!nicknameRegex.test(nickname)) {
        setNicknameAvailability({
          checking: false,
          available: null,
          message: "",
        });
        return;
      }

      setNicknameAvailability({
        checking: true,
        available: null,
        message: "",
      });

      nicknameCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await checkUserMutation.mutateAsync({
            nickname: nickname.trim(),
          });

          const isAvailable = response?.data?.nickname?.is_new_user;

          setNicknameAvailability({
            checking: false,
            available: isAvailable,
            message: isAvailable
              ? t("COMMON.USERNAME_AVAILABLE")
              : t("COMMON.USERNAME_TAKEN"),
          });
        } catch (error) {
          console.error("Error checking nickname:", error);
          setNicknameAvailability({
            checking: false,
            available: null,
            message: "",
          });
        }
      }, 500);
    },
    [t]
  );

  useEffect(() => {
    return () => {
      if (nicknameCheckTimeoutRef.current) {
        clearTimeout(nicknameCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (
    values: typeof initialValues,
    { resetForm }: FormikHelpers<typeof initialValues>
  ) => {
    const formData = new FormData();
    formData.append("company_name", values.first_name ?? "");
    formData.append("organizer_type", values.organizer_type ?? "");
    formData.append("email", values.email ?? "");
    formData.append("password", values.password ?? "");
    formData.append("phone_number", values.phone_number ?? "");
    formData.append("country_code", values.country_code ?? "");
    formData.append("license_number", values.license_number ?? "");
    if (values.nickname) {
      formData.append("nickname", values.nickname);
    }
    formData.append("latitude", values.latitude ?? "");
    formData.append("longitude", values.longitude ?? "");
    formData.append("preferred_language", selectedLanguage);
    formData.append("user_type", "organization");

    if (values.documents) {
      for (let i = 0; i < values.documents.length; i++) {
        formData.append("documents[]", values.documents[i]);
      }
    }

    try {
      await registerMutation.mutateAsync(formData);
      toast.success(t("COMMON.TOAST.REGISTRATION_SUCCESSFUL"));
      resetForm();
      router.push(`/email-verification?email=${encodeURIComponent(values.email)}&otp_type=register`);
    } catch (err: any) {
      const messages = getApiErrorMessages(err, selectedLanguage);
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.TOAST.REGISTRATION_FAILED"));
      }
    }
  };

  /**
   * What of this form can be carried into /complete-details so the organizer
   * does not answer the same questions twice. Uploaded documents are `File`
   * objects and cannot be serialized, so the certificate is asked for again.
   */
  const organizationPrefill = (values: typeof initialValues) => ({
    company_name: values.first_name,
    organizer_type: values.organizer_type,
    phone_number: values.phone_number,
    country_code: values.country_code,
    license_number: values.license_number,
    nickname: values.nickname,
    latitude: values.latitude,
    longitude: values.longitude,
  });

  // Set at click time, because the Google popup resolves long after the click
  // and the callback has no access to the Formik render scope.
  const pendingPrefillRef = useRef<Record<string, unknown>>({});

  /**
   * Both providers converge here. `/social-auth/` registers as well as logs in,
   * but it rejects a brand-new organization that arrives without its company
   * details, so a new email is routed through /complete-details first.
   */
  const continueSocialSignup = async (profile: SocialProfile) => {
    try {
      const checkUserResponse = await checkUserMutation.mutateAsync({
        email: profile.email,
      });

      if (checkUserResponse?.data?.email?.is_new_user) {
        toast.info(t("COMMON.TOAST.WELCOME_NEW_USER"));
        stashSocialProfile(profile);
        setSocialPrefill("organization", pendingPrefillRef.current);
        router.push(socialOnboardingRoute("organization"));
        return;
      }

      const response = await passSocialInfoMutation.mutateAsync({
        ...profile,
        user_type: "organization",
      });
      if (!isApiSuccess(response)) {
        toast.error(response?.msg || t("COMMON.TOAST.REGISTRATION_FAILED"));
        return;
      }

      setUser(response.data);
      toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));
      router.push("/");
    } catch (err) {
      // The documented 400 here is "this email signs in with a password" —
      // worth showing verbatim rather than behind a generic failure toast.
      const messages = getApiErrorMessages(err, selectedLanguage);
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.TOAST.REGISTRATION_FAILED"));
      }
    }
  };

  const googleLoginForOrganizer = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const profile = await handleGoogleLogin(tokenResponse);
      if (!profile) return;
      await continueSocialSignup(profile);
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      toast.error(t("COMMON.TOAST.GOOGLE_LOGIN_ERROR"));
    },
  });

  const handleLinkedinLogin = (values: typeof initialValues) => {
    // LinkedIn redirects to /linkedin-callback — the single registered URI —
    // which finishes the exchange and routes a brand-new organization onward.
    // That is a full page load, so park the answers before leaving.
    setLinkedinLoading(true);
    setSocialPrefill("organization", organizationPrefill(values));
    const started = startLinkedinLogin({ userType: "organization", returnTo: "/" });
    if (!started) {
      setLinkedinLoading(false);
      toast.error(t("COMMON.TOAST.LINKEDIN_NOT_CONFIGURED"));
    }
  };

  const isFormLoading =
    registerMutation.isPending ||
    // Deliberately not checkUserMutation: the nickname availability check
    // runs on every keystroke and reports itself inside the field.
    passSocialInfoMutation.isPending ||
    orgTypeLoading ||
    linkedinLoading;

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] relative">
        {isFormLoading && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-white/50">
            <Loader />
          </div>
        )}
        <h2 className="2xl:pb-11 lg:pb-5 pb-5 text-center font-bold xs:text-[22px] xs:leading-[26px] text-[28px] leading-[48px] md:text-[32px] md:leading-[52px] lg:text-[30px] lg:leading-[60px] 2xl:text-[50px] xl:leading-[68.09px] tracking-[0px] text-[#29246D]">
          {t("COMMON.CREATE_ACCOUNT_ORGANIZER")}
        </h2>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          validateOnBlur={false}
        >
          {({ setFieldValue, values, errors, touched }) => (
            <div className="flex justify-center">
              <Form className="w-[90%] 2xl:w-[720px] lg:w-[720px] md:w-[90%] rounded-lg bg-white">
                <div className="flex gap-6 mobilescreen:gap-1 mobilescreen:flex-col selectfiled">
                  <Input
                    name="first_name"
                    type="text"
                    label={t("COMMON.ENTER_FULL_NAME")}
                  />
                  <SelectInput
                    name="organizer_type"
                    label={t("COMMON.ORGANIZER.TYPE")}
                    options={orgTypeOptions}
                    onChange={(selectedOption) =>
                      setFieldValue("organizer_type", String(selectedOption?.value ?? ""))
                    }
                    disabled={orgTypeLoading}
                  />
                </div>
                <div className="flex gap-6 xs:block">
                  <Input
                    name="email"
                    type="email"
                    label={t("COMMON.ENTER_EMAIL")}
                  />
                  <Input
                    name="password"
                    type="password"
                    label={t("COMMON.ENTER_PASSWORD")}
                  />
                </div>
                <div className="flex gap-2">
                  <div>
                    <CountryCodeSelect
                      name="country_code"
                      className="w-full"
                      onChange={(value: string) =>
                        setFieldValue("country_code", value)
                      }
                    />
                  </div>
                  <div className="w-full">
                    <PhoneInput
                      name="phone_number"
                      label={t("COMMON.ENTER_PHONE_NUMBER")}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="w-full relative">
                  <Input
                    name="nickname"
                    endAdornment={
                      nicknameAvailability.checking ? (
                        <InlineSpinner label={t("COMMON.CHECKING_AVAILABILITY")} />
                      ) : null
                    }
                    type="text"
                    label={t("COMMON.NICKNAME")}
                    onChange={(e) => {
                      setFieldValue("nickname", e.target.value);
                      checkNicknameAvailability(e.target.value);
                    }}
                  />
                  {values.nickname && !errors.nickname && (
                    <div className="text-sm -mt-3 mb-4">
                      {!nicknameAvailability.checking &&
                        nicknameAvailability.available === true && (
                          <span className="text-green-600">
                            ✓ {nicknameAvailability.message}
                          </span>
                        )}
                      {!nicknameAvailability.checking &&
                        nicknameAvailability.available === false && (
                          <span className="text-red-600">
                            ✗ {nicknameAvailability.message}
                          </span>
                        )}
                    </div>
                  )}
                </div>
                <div>
                  <Input
                    name="license_number"
                    digitsOnly
                    inputMode="numeric"
                    maxLength={100}
                    type="text"
                    label={t("COMMON.ENTER_LICENSE_NUMBER")}
                  />
                </div>
                <div className="mb-4">
                  <UploadInput
                    name="documents"
                    label={t("COMMON.UPLOAD_CERTIFICATE")}
                    onChange={(event) => {
                      const files = event.currentTarget.files
                        ? Array.from(event.currentTarget.files)
                        : [];
                      setFieldValue("documents", files);
                    }}
                  />
                </div>
                <div className="mt-5">
                  <div>
                    <CheckBox
                      id="termsAccepted"
                      label={
                        <>
                          {t("COMMON.I_CONFIRM_READ_AGREE")}
                          <br className="hidden extrasmall1:block smallscreen:hidden" />
                          <Link
                            href="/termsofuse"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-504 hover:underline mx-1"
                          >
                            {t("COMMON.TERMS_OF_USE")}
                          </Link>
                          {t("COMMON.AND")}
                          <Link
                            href="/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-504 hover:underline mx-1"
                          >
                            {t("COMMON.PRIVACY_POLICY")}
                          </Link>
                        </>
                      }
                      checked={values.termsAccepted}
                      onChange={(checked: boolean) =>
                        setFieldValue("termsAccepted", checked)
                      }
                    />
                    {errors.termsAccepted && touched.termsAccepted && (
                      <div className="text-red-500 text-sm mt-1">
                        {errors.termsAccepted as string}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  className="mx-auto mt-[25px]"
                  variant="primary"
                  size="medium"
                  type="submit"
                  disabled={isFormLoading}
                >
                  {t("COMMON.CREATE_ACCOUNT")}
                </Button>
                <div>
                  <p className="font-semibold text-[18px] leading-[24.51px] pt-8 pb-8 text-primary-5 flex items-center w-full before:flex-1 before:border-t before:border-primary-5 before:mr-4 after:flex-1 after:border-t after:border-primary-5 after:ml-4 rtl:gap-[20px]">
                    {t("COMMON.SIGNUPWITH")}
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
                      pendingPrefillRef.current = organizationPrefill(values);
                      googleLoginForOrganizer();
                    }}
                    className="cursor-pointer"
                  />
                  <img
                    src="/assets/auth/linkdin.svg"
                    alt="LinkedIn"
                    onClick={() => handleLinkedinLogin(values)}
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-center text-primary-5 font-[400] text-[20px] pt-[32px]">
                  {t("COMMON.ALREADY_HAVE_ACCOUNT")}{" "}
                  <span
                    onClick={() =>
                      router.push("/login?user_type=organization")
                    }
                    className="font-bold text-[20px] leading-[27.24px] pb-1 tracking-[0px] border-b-2 border-b-primary-504 cursor-pointer text-primary-504"
                  >
                    {t("COMMON.LOGIN")}
                  </span>
                </p>
              </Form>
            </div>
          )}
        </Formik>
      </div>
    </div>
  );
}

export default function EntitiesAccountPage() {
  return (
    <Suspense fallback={<Loader />}>
      <EntitiesAccountPageComponent />
    </Suspense>
  );
}
