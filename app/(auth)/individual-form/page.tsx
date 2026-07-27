"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { Formik, Form, FormikHelpers, useFormikContext } from "formik";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import CheckBox from "@/components/ui/CheckBox";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { API_BASE_URL } from "@/lib/api/config";
import {
  YupEmail,
  YupPhoneNumber,
  YupRequiredString,
  YupStringMaxLength,
  YupStrongPassword,
  YupCivilId,
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
  const searchParams = useSearchParams();
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

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const validationSchema = Yup.object({
    first_name: YupStringMaxLength(100)
      .concat(YupRequiredString)
      .matches(/^[A-Za-z\s]+$/, t("COMMON.ENGLISH_ONLY")),
    last_name: YupStringMaxLength(100)
      .concat(YupRequiredString)
      .matches(/^[A-Za-z\s]+$/, t("COMMON.ENGLISH_ONLY")),
    nickname: YupStringMaxLength(100)
      .concat(YupRequiredString)
      .matches(/^[A-Za-z0-9._]+$/, t("COMMON.ENGLISH_ONLY"))
      .test("nickname-availability", t("COMMON.USERNAME_TAKEN"), function () {
        return nicknameAvailability.available !== false;
      }),
    gender: Yup.string().concat(YupRequiredString),
    phone_number: YupPhoneNumber,
    country_code: Yup.string().concat(YupRequiredString),
    dob: YupStringMaxLength(10).concat(YupRequiredString),
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
      then: () => YupStringMaxLength(100).concat(YupRequiredString),
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
      then: () => YupPhoneNumber,
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
  };

  const googleLoginForIndividual = useGoogleLogin({
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
          router.push("/volunteer-mandate-details");
          return;
        }

        const finalUserData: any = {
          ...userData,
          user_type: "volunteer",
          social_media_provider: "google",
        };

        const response = await passSocialInfoMutation.mutateAsync(finalUserData);
        const userDataToStore = response.data;
        setUser(userDataToStore);
        toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));
        router.push("/");
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
    const redirectUri = `${frontendUrl}/individual-form`;
    const scope = "openid profile email w_member_social";
    const stateData = {
      user_type: "volunteer",
      page_id: "individual_account",
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
    userType: string,
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
          toast.info("Welcome! Redirecting to complete your profile...");
          sessionStorage.setItem("oauth_user", JSON.stringify(userData));
          router.push("/volunteer-mandate-details");
          return;
        }

        const finalUserData: any = {
          social_media_id: userData.linkedin_id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          social_profile_pic_url: userData.picture,
          access_token: data.data.access_token,
          user_type: userType,
          social_media_provider: "linkedin",
        };

        const responseSocial = await passSocialInfoMutation.mutateAsync(finalUserData);
        const userDataToStore = responseSocial.data;
        setUser(userDataToStore);
        toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));
        router.push("/");
      } else {
        toast.error(t("COMMON.TOAST.LINKEDIN_LOGIN_FAILED"));
      }
    } catch (error) {
      console.error("Error during LinkedIn login:", error);
      toast.error(t("COMMON.TOAST.LINKEDIN_LOGIN_ERROR"));
      router.push("/individual-form");
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

        if (page_id === "individual_account") {
          handleLinkedinCallback(code, user_type, redirect_uri);
        }
      } catch (error) {
        console.error("Error parsing state parameter:", error);
        toast.error(t("COMMON.TOAST.INVALID_LINKEDIN_CALLBACK_STATE"));
        setLinkedinLoading(false);
      }
    }
  }, [searchParams]);

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

  const isFormLoading =
    registerMutation.isPending ||
    checkUserMutation.isPending ||
    passSocialInfoMutation.isPending ||
    linkedinLoading;

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] relative">
        {isFormLoading && (
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
                    />
                    <Input
                      name="last_name"
                      type="text"
                      label={t("COMMON.LASTNAMEPLACEHOLDER")}
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
                          <Input
                            name="phone_number"
                            type="number"
                            label={t("COMMON.PHONEPLACEHOLDER")}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="w-full relative">
                      <Input
                        name="nickname"
                        type="text"
                        label={t("COMMON.NICKNAMEPLACEHOLDER")}
                        className="w-full"
                        onChange={(e) => {
                          setFieldValue("nickname", e.target.value);
                          checkNicknameAvailability(e.target.value);
                        }}
                      />
                      {values.nickname && !errors.nickname && (
                        <div className="text-sm -mt-3 mb-4">
                          {nicknameAvailability.checking && (
                            <span className="text-gray-500">
                              {t("COMMON.CHECKING_AVAILABILITY")}...
                            </span>
                          )}
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
                      maxDate={new Date()}
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
                            <Input
                              name="emergency_contact_phone"
                              type="number"
                              label={t("COMMON.EMERGENCY_CONTACT_PHONE")}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <Input
                          name="emergency_contact_civil_id"
                          type="text"
                          label={t("COMMON.EMERGENCY_CONTACT_CIVIL_ID")}
                          maxLength={12}
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
                          toast.error("Google Login is not configured.");
                          return;
                        }
                        googleLoginForIndividual();
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
