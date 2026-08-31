"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react";
import { Formik, Form, FormikHelpers, useFormikContext } from "formik";
import Input from "@/components/ui/Input";
import InlineSpinner from "@/components/ui/InlineSpinner";
import PhoneInput from "@/components/ui/PhoneInput";
import Button from "@/components/ui/Button";
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
} from "@/features/auth/services/authApi";
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
  YupCivilId,
  YupDateOfBirth,
  MIN_SIGNUP_AGE,
  createPhoneNumberSchema,
  calculateAgeFromDob,
  maxDateOfBirthFor,
} from "@/lib/schema";
import { cn, handleGoogleLogin } from "@/lib/helpers";
import dynamic from "next/dynamic";
const CountryCodeSelect = dynamic(
  () => import("@/components/ui/CountryCodeSelect"),
  { ssr: false, loading: () => <div className="h-[48px] rounded-2xl bg-gray-100 animate-pulse mb-4" /> }
);
import BirthDateField from "@/components/ui/BirthDateField";
import SelectInput from "@/components/ui/SelectInput";
import Loader from "@/components/ui/Loader";
import { nationalityOptions } from "@/data/Constants";

function DobWatcher({
  setIsUnder18,
  calculateAge,
}: {
  setIsUnder18: (value: boolean) => void;
  calculateAge: (dob: string) => number | null;
}) {
  const { values } = useFormikContext<any>();

  useEffect(() => {
    if (values.dob) {
      const age = calculateAge(values.dob);
      setIsUnder18(age !== null && age < 18);
    } else {
      setIsUnder18(false);
    }
  }, [values.dob, calculateAge, setIsUnder18]);

  return null;
}

function IndividualAccountPageComponent() {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const setUser = useAuthStore((s) => s.setUser);

  const [isUnder18, setIsUnder18] = useState(false);
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
  const { data: genderData, isLoading: genderLoading } = useQuery({
    queryKey: ["gender-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("gender"),
    enabled: !!selectedLanguage,
  });

  const { data: relationshipData, isLoading: relationshipLoading } = useQuery({
    queryKey: ["emergency-contact-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("emergency_contact_relationship"),
    enabled: !!selectedLanguage,
  });

  const genderOptions =
    genderData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id,
    })) || [];

  const relationshipOptions =
    relationshipData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id,
    })) || [];

  const initialValues = {
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone_number: "",
    country_code: "",
    nickname: "",
    gender: "",
    termsAccepted: false,
    dob: "",
    civil_id: "",
    nationality: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_country_code: "",
    emergency_contact_civil_id: "",
    emergency_contact_relationship: "",
  };

  const calculateAge = calculateAgeFromDob;

  // Recomputed only on mount: a new Date object every render would make the
  // picker think its bounds changed.
  const maxBirthDate = useMemo(() => maxDateOfBirthFor(MIN_SIGNUP_AGE), []);

  const validationSchema = Yup.object({
    first_name: YupStringMaxLength(30)
      .concat(YupRequiredString)
      .matches(/^[A-Za-z\s]+$/, t("COMMON.ENGLISH_ONLY")),
    last_name: YupStringMaxLength(30)
      .concat(YupRequiredString)
      .matches(/^[A-Za-z\s]+$/, t("COMMON.ENGLISH_ONLY")),
    nickname: YupStringMaxLength(30)
      .concat(YupRequiredString)
      .matches(/^[A-Za-z0-9._]+$/, t("COMMON.ENGLISH_ONLY"))
      .test("nickname-availability", t("COMMON.USERNAME_TAKEN"), function () {
        return nicknameAvailability.available !== false;
      }),
    gender: Yup.string().concat(YupRequiredString),
    phone_number: Yup.string().when("country_code", (country_code: any, schema: any) => {
      const code = Array.isArray(country_code) ? country_code[0] : country_code;
      return createPhoneNumberSchema(code);
    }),
    country_code: Yup.string().concat(YupRequiredString),
    dob: YupDateOfBirth(MIN_SIGNUP_AGE),
    email: YupEmail,
    password: YupStrongPassword,
    civil_id: YupCivilId,
    nationality: Yup.string().concat(YupRequiredString),
    termsAccepted: Yup.boolean()
      .required(t("COMMON.REQUIRED.FIELD"))
      .oneOf([true], t("COMMON.TERMS_ACCEPTANCE_REQUIRED")),
    emergency_contact_name: Yup.string().when("dob", {
      is: (dob: string) => {
        const age = calculateAge(dob);
        return age !== null && age < 18;
      },
      then: () => YupStringMaxLength(100).concat(YupRequiredString).matches(/^[A-Za-z\s]+$/, t("COMMON.ENGLISH_ONLY")),
      otherwise: () => Yup.string().notRequired(),
    }),
    emergency_contact_country_code: Yup.string().when("dob", {
      is: (dob: string) => {
        const age = calculateAge(dob);
        return age !== null && age < 18;
      },
      then: () => YupRequiredString,
      otherwise: () => Yup.string().notRequired(),
    }),
    emergency_contact_phone: Yup.string().when("dob", {
      is: (dob: string) => {
        const age = calculateAge(dob);
        return age !== null && age < 18;
      },
      then: () => Yup.string().when("emergency_contact_country_code", (emergency_contact_country_code: any, schema: any) => {
        const code = Array.isArray(emergency_contact_country_code) ? emergency_contact_country_code[0] : emergency_contact_country_code;
        return createPhoneNumberSchema(code);
      }),
      otherwise: () => Yup.string().notRequired(),
    }),
    emergency_contact_civil_id: Yup.string().when("dob", {
      is: (dob: string) => {
        const age = calculateAge(dob);
        return age !== null && age < 18;
      },
      then: () => YupCivilId,
      otherwise: () => Yup.string().notRequired(),
    }),
    emergency_contact_relationship: Yup.string().when("dob", {
      is: (dob: string) => {
        const age = calculateAge(dob);
        return age !== null && age < 18;
      },
      then: () => YupRequiredString,
      otherwise: () => Yup.string().notRequired(),
    }),
  });

  const handleSubmit = async (
    values: typeof initialValues,
    { resetForm }: FormikHelpers<typeof initialValues>
  ) => {
    try {
      await registerMutation.mutateAsync({
        ...values,
        gender: values.gender,
        country_code: values.country_code,
        phone_number: values.phone_number,
        user_type: "volunteer",
        preferred_language: selectedLanguage,
      });

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
   * What of this form can be carried into /volunteer-mandate-details so the
   * volunteer does not answer the same questions twice. `civil_id` matters
   * most: `/social-auth/` refuses a brand-new volunteer without one.
   */
  const volunteerPrefill = (values: typeof initialValues) => ({
    first_name: values.first_name,
    last_name: values.last_name,
    phone_number: values.phone_number,
    country_code: values.country_code,
    nickname: values.nickname,
    dob: values.dob,
    gender: values.gender,
    civil_id: values.civil_id,
    nationality: values.nationality,
    emergency_contact_name: values.emergency_contact_name,
    emergency_contact_phone: values.emergency_contact_phone,
    emergency_contact_country_code: values.emergency_contact_country_code,
    emergency_contact_civil_id: values.emergency_contact_civil_id,
    emergency_contact_relationship: values.emergency_contact_relationship,
  });

  // Set at click time, because the Google popup resolves long after the click
  // and the callback has no access to the Formik render scope.
  const pendingPrefillRef = useRef<Record<string, unknown>>({});

  /**
   * Both providers converge here. `/social-auth/` registers as well as logs in,
   * but it rejects a brand-new volunteer that arrives without `civil_id`, so a
   * new email is routed through the mandate screen first.
   */
  const continueSocialSignup = async (profile: SocialProfile) => {
    try {
      const checkUserResponse = await checkUserMutation.mutateAsync({
        email: profile.email,
      });

      if (checkUserResponse?.data?.email?.is_new_user) {
        toast.info(t("COMMON.TOAST.WELCOME_NEW_USER"));
        stashSocialProfile(profile);
        setSocialPrefill("volunteer", pendingPrefillRef.current);
        router.push(socialOnboardingRoute("volunteer"));
        return;
      }

      const response = await passSocialInfoMutation.mutateAsync({
        ...profile,
        user_type: "volunteer",
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

  const googleLoginForIndividual = useGoogleLogin({
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
    // which finishes the exchange and routes a brand-new volunteer onward.
    // That is a full page load, so park the answers before leaving.
    setLinkedinLoading(true);
    setSocialPrefill("volunteer", volunteerPrefill(values));
    const started = startLinkedinLogin({ userType: "volunteer", returnTo: "/" });
    if (!started) {
      setLinkedinLoading(false);
      toast.error(t("COMMON.TOAST.LINKEDIN_NOT_CONFIGURED"));
    }
  };

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

  /**
   * The social paths hand the tab to Google or LinkedIn, so they keep the
   * overlay. Submitting the form reports itself inside the submit button.
   */
  const isSocialLoading =
    // Deliberately not checkUserMutation: the nickname availability check
    // runs on every keystroke and reports itself inside the field.
    passSocialInfoMutation.isPending || linkedinLoading;

  const isFormLoading = registerMutation.isPending || isSocialLoading;

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] relative">
        {isSocialLoading && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-white/50">
            <Loader />
          </div>
        )}
        <h2 className="2xl:pb-11 lg:pb-5 pb-5 text-center font-bold text-[26px] 2xl:text-[50px] tracking-[0px] text-[#29246D]">
          {t("COMMON.CREATEINDIVIDUALACCOUNT")}
        </h2>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ setFieldValue, values, errors, touched }) => (
            <div className="flex justify-center">
              <div className="w-[90%] 2xl:w-[720px] lg:w-[720px] md:w-[90%] rounded-lg bg-white relative">
                <Form>
                  <DobWatcher setIsUnder18={setIsUnder18} calculateAge={calculateAge} />
                  <div className="flex gap-6 mobilescreen:block">
                    <Input
                      name="first_name"
                      type="text"
                      label={t("COMMON.FIRSTNAMEPLACEHOLDER")}
                      className="text-primary-5"
                      autoComplete="off"
                      maxLength={30}
                    />
                    <Input
                      name="last_name"
                      type="text"
                      label={t("COMMON.LASTNAMEPLACEHOLDER")}
                      maxLength={30}
                    />
                  </div>
                  <div className="flex gap-6 mobilescreen:block">
                    <Input
                      name="email"
                      type="text"
                      label={t("COMMON.EMAILPLACEHOLDER")}
                    />
                    <Input
                      name="password"
                      type="password"
                      label={t("COMMON.PASSWORDPLACEHOLDER")}
                      className="text-primary-5"
                    />
                  </div>
                  <div className="grid grid-cols-2 mobilescreen:grid-cols-1 mobilescreen:gap-0 gap-6 xs:block">
                    <div className="">
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
                            label={t("COMMON.PHONEPLACEHOLDER")}
                            className="w-full"
                            countryCode={values.country_code}
                          />
                        </div>
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
                        label={t("COMMON.NICKNAMEPLACEHOLDER")}
                        className="w-full"
                        maxLength={30}
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
                  </div>
                  <div className="gap-5 mobilescreen:gap-0 grid grid-cols-2 mobilescreen:grid-cols-1 selectfiled">
                    <BirthDateField
                      name="dob"
                      label={t("COMMON.DATE_OF_BIRTH")}
                      maxDate={maxBirthDate}
                    />
                    <SelectInput
                      name="gender"
                      label={t("COMMON.GENDERPLACEHOLDER")}
                      options={genderOptions}
                      onChange={(selectedOption) =>
                        setFieldValue("gender", selectedOption?.value || "")
                      }
                      disabled={genderLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 mobilescreen:grid-cols-1 mobilescreen:gap-0 gap-6 selectfiled">
                    <Input
                      name="civil_id"
                      type="text"
                      label={t("COMMON.CIVIL_ID")}
                      maxLength={12}
                      digitsOnly
                    />
                    <SelectInput
                      name="nationality"
                      label={t("COMMON.NATIONALITY")}
                      options={nationalityOptions.map((item) => ({
                        label: selectedLanguage === "ar" ? item.name_ar : item.name_en,
                        value: item.value,
                      }))}
                      onChange={(selectedOption) =>
                        setFieldValue("nationality", selectedOption?.value || "")
                      }
                    />
                  </div>

                  {isUnder18 && (
                    <>
                      <div className="mt-6 mb-4">
                        <h3 className="text-lg font-semibold text-primary-5">
                          {t("COMMON.EMERGENCY_CONTACT_DETAILS")}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {t("COMMON.EMERGENCY_CONTACT_REQUIRED_UNDER_18")}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 mobilescreen:grid-cols-1 mobilescreen:gap-0 gap-6">
                        <Input
                          name="emergency_contact_name"
                          type="text"
                          label={t("COMMON.EMERGENCY_CONTACT_NAME")}
                          lettersOnly
                        />

                        <SelectInput
                          name="emergency_contact_relationship"
                          label={t("COMMON.EMERGENCY_CONTACT_RELATIONSHIP")}
                          options={relationshipOptions}
                          onChange={(selectedOption) =>
                            setFieldValue("emergency_contact_relationship", selectedOption?.value || "")
                          }
                          disabled={relationshipLoading}
                        />
                      </div>

                      <div className="grid grid-cols-2 mobilescreen:grid-cols-1 mobilescreen:gap-0 gap-6">
                        <div className="flex gap-2">
                          <div>
                            <CountryCodeSelect
                              name="emergency_contact_country_code"
                              className="w-full"
                              onChange={(value: string) =>
                                setFieldValue("emergency_contact_country_code", value)
                              }
                            />
                          </div>
                          <div className="w-full">
                            <PhoneInput
                              name="emergency_contact_phone"
                              label={t("COMMON.EMERGENCY_CONTACT_PHONE")}
                              className="w-full"
                              countryCode={values.emergency_contact_country_code}
                            />
                          </div>
                        </div>

                        <Input
                          name="emergency_contact_civil_id"
                          type="text"
                          label={t("COMMON.EMERGENCY_CONTACT_CIVIL_ID")}
                          maxLength={12}
                          digitsOnly
                        />
                      </div>
                    </>
                  )}

                  <div className="mt-1">
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

                  <Button
                    className="mx-auto mt-[25px]"
                    variant="primary"
                    size="medium"
                    type="submit"
                    disabled={isFormLoading || genderLoading || relationshipLoading}
                    loading={registerMutation.isPending}
                  >
                    {t("COMMON.CREATEACCOUNT")}
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
                        pendingPrefillRef.current = volunteerPrefill(values);
                        googleLoginForIndividual();
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
                  <p className="text-primary-5 text-center font-[400] text-[20px] leading-[27.24px] pt-[30px]">
                    {t("COMMON.ALREADYHAVEACCOUNT")}{" "}
                    <span
                      onClick={() =>
                        router.push("/login?user_type=volunteer")
                      }
                      className="font-bold text-[20px] leading-[27.24px] tracking-[0px] text-primary-504 border-b-2 border-b-primary-504 cursor-pointer pb-1"
                    >
                      {t("COMMON.LOGIN")}
                    </span>
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

export default function IndividualAccountPage() {
  return (
    <Suspense fallback={<Loader />}>
      <IndividualAccountPageComponent />
    </Suspense>
  );
}
