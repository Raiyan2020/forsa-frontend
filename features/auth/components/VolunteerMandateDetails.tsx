"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Formik, Form, FormikHelpers } from "formik";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import CheckBox from "@/components/ui/CheckBox";
import SelectInput from "@/components/ui/SelectInput";
import BirthDateField from "@/components/ui/BirthDateField";
import {
  checkUserRequest,
  getDropdownChoicesRequest,
  passSocialInfoRequest,
} from "@/features/auth/api/authApi";
import { getApiErrorMessages } from "@/lib/api/errors";
import { nationalityOptions } from "@/data/Constants";
import { cn } from "@/lib/helpers";
import {
  YupCivilId,
  YupPhoneNumber,
  YupRequiredString,
  YupStringMaxLength,
} from "@/lib/schema";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";

const CountryCodeSelect = dynamic(
  () => import("@/components/ui/CountryCodeSelect"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[48px] rounded-2xl bg-gray-100 animate-pulse mb-4" />
    ),
  }
);

interface VolunteerMandateDetailsProps {
  userData?: any;
  onClose?: () => void;
  isModal?: boolean;
}

interface MandateFormValues {
  first_name: string;
  last_name: string;
  phone_number: string;
  nickname: string;
  dob: string;
  gender: string;
  country_code: string;
  civil_id: string;
  nationality: string;
  termsAccepted: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_country_code: string;
  emergency_contact_civil_id: string;
  emergency_contact_relationship: string;
}

const calculateAge = (dob: string) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
};

const isUnderage = (dob: string) => {
  const age = calculateAge(dob);
  return age !== null && age < 18;
};

export default function VolunteerMandateDetails({
  userData: propUserData,
  onClose,
  isModal,
}: VolunteerMandateDetailsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const setUser = useAuthStore((s) => s.setUser);

  // Rendered as a page the OAuth payload comes from sessionStorage (the login /
  // sign-up screens stash it there); rendered as a modal it arrives as a prop.
  const [storedUserData, setStoredUserData] = useState<any>(null);
  const userData = propUserData || storedUserData;

  const passSocialInfoMutation = useMutation({
    mutationFn: passSocialInfoRequest,
  });
  const checkUserMutation = useMutation({ mutationFn: checkUserRequest });

  // Username availability check states
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

  // Fetch gender options from API
  const {
    data: genderData,
    isLoading: genderLoading,
    error: genderError,
  } = useQuery({
    queryKey: ["gender-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("gender"),
    enabled: !!selectedLanguage,
  });

  const { data: relationshipData, isLoading: relationshipLoading } = useQuery({
    queryKey: ["emergency-contact-relationship-choices", selectedLanguage],
    queryFn: () =>
      getDropdownChoicesRequest("emergency_contact_relationship"),
    enabled: !!selectedLanguage,
  });

  // Transform API response into options for SelectInput
  const genderOptions =
    genderData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id, // Use id as the value to send to backend
    })) || [];

  const relationshipOptions =
    relationshipData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id,
    })) || [];

  useEffect(() => {
    window.scrollTo(0, 0);
    if (propUserData) return;
    try {
      const stored = sessionStorage.getItem("oauth_user");
      if (stored) setStoredUserData(JSON.parse(stored));
    } catch {
      // No stashed payload — the name fields simply start empty.
    }
  }, [propUserData]);

  const initialValues: MandateFormValues = {
    first_name: userData?.first_name || "",
    last_name: userData?.last_name || "",
    phone_number: "",
    nickname: "",
    dob: "",
    gender: "",
    country_code: "",
    civil_id: "",
    nationality: "",
    termsAccepted: false,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_country_code: "",
    emergency_contact_civil_id: "",
    emergency_contact_relationship: "",
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
    dob: YupStringMaxLength(10).concat(YupRequiredString),
    country_code: Yup.string().concat(YupRequiredString),
    civil_id: YupCivilId,
    nationality: Yup.string().concat(YupRequiredString),
    termsAccepted: Yup.boolean()
      .required(t("COMMON.REQUIRED.FIELD"))
      .oneOf([true], t("COMMON.TERMS_ACCEPTANCE_REQUIRED")),
    // Conditional validation for emergency contacts (required if under 18)
    emergency_contact_name: Yup.string().when("dob", {
      is: isUnderage,
      then: () => YupStringMaxLength(100).concat(YupRequiredString),
      otherwise: () => Yup.string().notRequired(),
    }),
    emergency_contact_country_code: Yup.string().when("dob", {
      is: isUnderage,
      then: () => YupRequiredString,
      otherwise: () => Yup.string().notRequired(),
    }),
    emergency_contact_phone: Yup.string().when("dob", {
      is: isUnderage,
      then: () => YupPhoneNumber,
      otherwise: () => Yup.string().notRequired(),
    }),
    emergency_contact_civil_id: Yup.string().when("dob", {
      is: isUnderage,
      then: () => YupCivilId,
      otherwise: () => Yup.string().notRequired(),
    }),
    emergency_contact_relationship: Yup.string().when("dob", {
      is: isUnderage,
      then: () => YupRequiredString,
      otherwise: () => Yup.string().notRequired(),
    }),
  });

  // Debounced nickname availability check
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

      setNicknameAvailability({ checking: true, available: null, message: "" });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    values: MandateFormValues,
    { resetForm }: FormikHelpers<MandateFormValues>
  ) => {
    try {
      const finalUserData = {
        ...userData,
        ...values,
        gender: values.gender, // gender is now the id (e.g., "1"), no need for toLowerCase
        user_type: "volunteer",
        preferred_language: selectedLanguage,
      };

      const response = await passSocialInfoMutation.mutateAsync(finalUserData);
      setUser(response.data);
      sessionStorage.removeItem("oauth_user");
      toast.success(t("COMMON.TOAST.PROFILE_COMPLETION"));
      resetForm();
      if (onClose) {
        onClose();
      } else {
        router.push("/");
      }
    } catch (err: any) {
      const messages = getApiErrorMessages(err, selectedLanguage);
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.TOAST.REGISTRATION_FAILED"));
      }
    }
  };

  if (genderError) {
    return <div>{t("COMMON.ERROR.LOADING_GENDER_OPTIONS")}</div>;
  }

  return (
    <div className={cn(!onClose && "border-t", "border-[#000]")}>
      <div
        className={
          isModal
            ? ""
            : "2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]"
        }
      >
        {!isModal && (
          <h2 className="2xl:pb-11 lg:pb-5 pb-5 text-center font-bold xs:text-[22px] xs:leading-[26px] text-[28px] leading-[48px] md:text-[32px] md:leading-[52px] lg:text-[30px] lg:leading-[60px] 2xl:text-[50px] xl:leading-[68.09px] tracking-[0px] text-[#29246D]">
            {t("COMMON.COMPLETEYOURDETAILS")}
          </h2>
        )}
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ setFieldValue, values, errors, touched }) => {
            const isUnder18 = isUnderage(values.dob);

            return (
              <div className="flex justify-center">
                <div className="w-[90%] 2xl:w-[720px] lg:w-[720px] md:w-[90%] rounded-lg bg-white">
                  <Form>
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
                    <div className="grid grid-cols-2 mobilescreen:grid-cols-1 mobilescreen:gap-0 gap-6 xs:block">
                      {/* Country Code and Phone Number */}
                      <div>
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

                      {/* Nickname */}
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
                    <div className="grid grid-cols-2 mobilescreen:grid-cols-1 mobilescreen:gap-0 gap-5 selectfiled">
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
                          label:
                            selectedLanguage === "ar"
                              ? item.name_ar
                              : item.name_en,
                          value: item.value,
                        }))}
                        onChange={(selectedOption) =>
                          setFieldValue(
                            "nationality",
                            selectedOption?.value || ""
                          )
                        }
                      />
                    </div>

                    {/* Emergency Contact Fields - Only shown if user is under 18 */}
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
                              setFieldValue(
                                "emergency_contact_relationship",
                                selectedOption?.value || ""
                              )
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
                                  setFieldValue(
                                    "emergency_contact_country_code",
                                    value
                                  )
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
                          {errors.termsAccepted}
                        </div>
                      )}
                    </div>

                    <Button
                      className="mx-auto mt-[25px]"
                      variant="primary"
                      size="medium"
                      type="submit"
                      disabled={
                        passSocialInfoMutation.isPending ||
                        genderLoading ||
                        relationshipLoading
                      }
                    >
                      {t("COMMON.SUBMIT")}
                    </Button>
                  </Form>
                </div>
              </div>
            );
          }}
        </Formik>
      </div>
    </div>
  );
}
