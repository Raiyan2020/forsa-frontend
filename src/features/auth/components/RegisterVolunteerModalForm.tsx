"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Form, Formik, FormikHelpers, useFormikContext } from "formik";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useGoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import { Button } from "@/components/ui/Button";
import BirthDateField from "@/components/ui/BirthDateField";
import CheckBox from "@/components/ui/CheckBox";
import ModalInput from "@/components/ui/ModalInput";
import InlineSpinner from "@/components/ui/InlineSpinner";
import { ModalPhoneInput } from "@/components/ui/PhoneInput";
import SelectInput from "@/components/ui/SelectInput";
import {
  checkUserRequest,
  getDropdownChoicesRequest,
  passSocialInfoRequest,
  registerRequest,
} from "@/features/auth/services/authApi";
import { nationalityOptions } from "@/data/Constants";
import { getApiErrorMessages } from "@/lib/api/errors";
import { startLinkedinLogin } from "@/lib/auth/linkedin";
import { handleGoogleLogin } from "@/lib/helpers";
import { YupCivilId, YupEmail, YupPhoneNumber, YupRequiredString, YupStringMaxLength, YupStrongPassword, createPhoneNumberSchema } from "@/features/shared/schemas";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";

const CountryCodeSelect = dynamic(
  () => import("@/components/ui/CountryCodeSelect"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[48px] w-[90px] rounded-2xl bg-gray-100 animate-pulse" />
    ),
  }
);

interface RegisterVolunteerModalFormProps {
  onClose?: () => void;
  onShowEmailVerification?: (email: string, otpType: string) => void;
  onShowVolunteerMandateDetails?: (userData: any) => void;
  /** Comes from the host page; defaults to a volunteer signup. */
  userType?: string;
}

interface ChoiceItem {
  id: string;
  value_en: string;
  value_ar: string;
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

/**
 * The React original ran this `useEffect` inside the Formik render prop. Hooks
 * can't live there, so the watcher is its own child component.
 */
function DobWatcher({
  setIsUnder18,
}: {
  setIsUnder18: (value: boolean) => void;
}) {
  const { values } = useFormikContext<{ dob: string }>();

  useEffect(() => {
    if (values.dob) {
      const age = calculateAge(values.dob);
      setIsUnder18(age !== null && age < 18);
    } else {
      setIsUnder18(false);
    }
  }, [values.dob, setIsUnder18]);

  return null;
}

const FIELD_LABEL_CLASS =
  "text-secondary-100 2xl:text-[25px] lg:text-lg md:text-lg xss:text-sm font-semibold 2xl:pb-5 laptopmain:pb-2 pb-2";

export default function RegisterVolunteerModalForm({
  onClose,
  onShowEmailVerification,
  onShowVolunteerMandateDetails,
  userType = "volunteer",
}: RegisterVolunteerModalFormProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const setUser = useAuthStore((s) => s.setUser);

  const [isUnder18, setIsUnder18] = useState(false);
  const [nicknameAvailability, setNicknameAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: "" });
  const nicknameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const registerMutation = useMutation({ mutationFn: registerRequest });
  const checkUserMutation = useMutation({ mutationFn: checkUserRequest });
  const passSocialInfoMutation = useMutation({
    mutationFn: passSocialInfoRequest,
  });

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
    genderData?.data?.map((item: ChoiceItem) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id,
    })) || [];

  const relationshipOptions =
    relationshipData?.data?.map((item: ChoiceItem) => ({
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
    civil_id: "",
    nationality: "",
    termsAccepted: false,
    dob: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_country_code: "",
    emergency_contact_civil_id: "",
    emergency_contact_relationship: "",
  };

  const requiredWhenUnder18 = <T extends Yup.AnySchema>(schema: () => T) =>
    Yup.string().when("dob", {
      is: (dob: string) => {
        const age = calculateAge(dob);
        return age !== null && age < 18;
      },
      then: schema as any,
      otherwise: () => Yup.string().notRequired(),
    });

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
    phone_number: Yup.string().when("country_code", (country_code: any, schema: any) => {
      const code = Array.isArray(country_code) ? country_code[0] : country_code;
      return createPhoneNumberSchema(code);
    }),
    country_code: Yup.string().concat(YupRequiredString),
    dob: YupStringMaxLength(10).concat(YupRequiredString),
    civil_id: YupCivilId,
    nationality: Yup.string().concat(YupRequiredString),
    email: YupEmail,
    password: YupStrongPassword,
    termsAccepted: Yup.boolean()
      .required(t("COMMON.REQUIRED.FIELD"))
      .oneOf([true], t("COMMON.TERMS_ACCEPTANCE_REQUIRED")),
    emergency_contact_name: requiredWhenUnder18(() =>
      YupStringMaxLength(100).concat(YupRequiredString).matches(/^[A-Za-z\s]+$/, t("COMMON.ENGLISH_ONLY"))
    ),
    emergency_contact_country_code: requiredWhenUnder18(() => YupRequiredString),
    emergency_contact_phone: requiredWhenUnder18(() =>
      Yup.string().when("emergency_contact_country_code", (emergency_contact_country_code: any, schema: any) => {
        const code = Array.isArray(emergency_contact_country_code) ? emergency_contact_country_code[0] : emergency_contact_country_code;
        return createPhoneNumberSchema(code);
      })
    ),
    emergency_contact_civil_id: requiredWhenUnder18(() => YupCivilId),
    emergency_contact_relationship: requiredWhenUnder18(() => YupRequiredString),
  });

  const checkNicknameAvailability = useCallback(
    async (nickname: string) => {
      if (nicknameCheckTimeoutRef.current) {
        clearTimeout(nicknameCheckTimeoutRef.current);
      }

      const nicknameRegex = /^[A-Za-z0-9._]+$/;
      if (!nickname || nickname.trim() === "" || !nicknameRegex.test(nickname)) {
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

  const reportRegistrationError = (error: any) => {
    const messages = getApiErrorMessages(error, selectedLanguage);
    if (messages.length > 0) {
      messages.forEach((message) => toast.error(message));
    } else {
      toast.error(t("COMMON.TOAST.REGISTRATION_FAILED"));
    }
  };

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
        civil_id: values.civil_id,
        user_type: "volunteer",
        preferred_language: selectedLanguage,
      });

      toast.success(t("COMMON.TOAST.REGISTRATION_SUCCESSFUL"));
      resetForm();
      onClose?.();
      onShowEmailVerification?.(values.email, "register");
    } catch (error) {
      reportRegistrationError(error);
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

        if (checkUserResponse?.data?.email?.is_new_user) {
          toast.info(t("COMMON.TOAST.WELCOME_NEW_USER"));
          onClose?.();
          onShowVolunteerMandateDetails?.(userData);
          return;
        }

        const response = await passSocialInfoMutation.mutateAsync({
          ...userData,
          user_type: userType,
          social_media_provider: "google",
        });
        setUser(response.data);
        toast.success(t("COMMON.TOAST.LOGIN_SUCCESSFUL"));
        onClose?.();
      } catch (error) {
        reportRegistrationError(error);
      }
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      toast.error(t("COMMON.TOAST.GOOGLE_LOGIN_ERROR"));
    },
  });

  const handleLinkedinLogin = () => {
    // LinkedIn only accepts pre-registered redirect URIs, so the flow always
    // lands on /linkedin-callback and returns to this page via `original_path`,
    // which re-opens the modal on the volunteer mandate step.
    if (!startLinkedinLogin({ userType, originalPath: window.location.pathname })) {
      toast.error(t("COMMON.TOAST.LINKEDIN_NOT_CONFIGURED"));
    }
  };

  const isBusy =
    registerMutation.isPending ||
    passSocialInfoMutation.isPending ||
    genderLoading ||
    relationshipLoading;

  return (
    <div className="relative">
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ setFieldValue, values, errors, touched }) => (
          <div className="mx-auto mobilescreen:w-full">
            <div className="mobilescreen:w-full mx-auto filtermodal">
              <Form>
                <DobWatcher setIsUnder18={setIsUnder18} />

                <div className="grid grid-cols-2 mobilescreen:gap-[0] mobilescreen:grid-cols-1 gap-[100px]">
                  <div>
                    <p className={FIELD_LABEL_CLASS}>{t("COMMON.FIRSTNAME")}</p>
                    <ModalInput
                      name="first_name"
                      type="text"
                      placeholder={t("COMMON.FIRSTNAME")}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <p className={FIELD_LABEL_CLASS}>{t("COMMON.LASTNAME")}</p>
                    <ModalInput
                      name="last_name"
                      type="text"
                      placeholder={t("COMMON.LASTNAME")}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[100px] mobilescreen:gap-[0px] mobilescreen:grid-cols-1">
                  <div>
                    <p className={FIELD_LABEL_CLASS}>{t("COMMON.EMAIL")}</p>
                    <ModalInput
                      name="email"
                      type="text"
                      placeholder={t("COMMON.EMAIL")}
                    />
                  </div>
                  <div>
                    <p className={FIELD_LABEL_CLASS}>{t("COMMON.PASSWORD")}</p>
                    <ModalInput
                      name="password"
                      type="password"
                      placeholder={t("COMMON.PASSWORD")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 mobilescreen:gap-[0px] mobilescreen:grid-cols-1 gap-[100px]">
                  <div>
                    <p className={FIELD_LABEL_CLASS}>
                      {t("COMMON.PHONENUMBER")}
                    </p>
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
                      <ModalPhoneInput
                        name="phone_number"
                        placeholder={t("COMMON.PHONENUMBER")}
                        countryCode={values.country_code}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <p className={FIELD_LABEL_CLASS}>{t("COMMON.NICKNAME")}</p>
                    <ModalInput
                      name="nickname"
                      endAdornment={
                        nicknameAvailability.checking ? (
                          <InlineSpinner label={t("COMMON.CHECKING_AVAILABILITY")} />
                        ) : null
                      }
                      type="text"
                      placeholder={t("COMMON.NICKNAME")}
                      autoComplete="off"
                      onChange={(event) => {
                        setFieldValue("nickname", event.target.value);
                        checkNicknameAvailability(event.target.value);
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

                <div className="grid grid-cols-2 mobilescreen:gap-[0px] mobilescreen:grid-cols-1 gap-[100px]">
                  <div>
                    <p className={FIELD_LABEL_CLASS}>
                      {t("COMMON.DATE_OF_BIRTH")}
                    </p>
                    <BirthDateField
                      name="dob"
                      label={t("COMMON.DATE_OF_BIRTH")}
                      maxDate={new Date()}
                    />
                  </div>
                  <div>
                    <p className={FIELD_LABEL_CLASS}>{t("COMMON.GENDER")}</p>
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
                </div>

                <div className="grid grid-cols-2 mobilescreen:gap-[0px] mobilescreen:grid-cols-1 gap-[100px]">
                  <div>
                    <p className={FIELD_LABEL_CLASS}>{t("COMMON.CIVIL_ID")}</p>
                    <ModalInput
                      name="civil_id"
                      type="text"
                      placeholder={t("COMMON.CIVIL_ID")}
                      maxLength={12}
                      digitsOnly
                    />
                  </div>
                  <div>
                    <p className={FIELD_LABEL_CLASS}>
                      {t("COMMON.NATIONALITY")}
                    </p>
                    <SelectInput
                      name="nationality"
                      label={t("COMMON.NATIONALITY")}
                      options={nationalityOptions.map((item) => ({
                        label:
                          selectedLanguage === "ar" ? item.name_ar : item.name_en,
                        value: item.value,
                      }))}
                      onChange={(selectedOption) =>
                        setFieldValue("nationality", selectedOption?.value || "")
                      }
                    />
                  </div>
                </div>

                {/* Emergency contact block — only required for under-18 signups */}
                {isUnder18 && (
                  <>
                    <div className="mt-6 mb-4">
                      <h3 className="text-lg font-semibold text-secondary-100">
                        {t("COMMON.EMERGENCY_CONTACT_DETAILS")}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {t("COMMON.EMERGENCY_CONTACT_REQUIRED_UNDER_18")}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 mobilescreen:grid-cols-1 mobilescreen:gap-[0px] gap-[100px]">
                      <div>
                        <p className={FIELD_LABEL_CLASS}>
                          {t("COMMON.EMERGENCY_CONTACT_NAME")}
                        </p>
                        <ModalInput
                          name="emergency_contact_name"
                          type="text"
                          placeholder={t("COMMON.EMERGENCY_CONTACT_NAME")}
                          lettersOnly
                        />
                      </div>
                      <div>
                        <p className={FIELD_LABEL_CLASS}>
                          {t("COMMON.EMERGENCY_CONTACT_RELATIONSHIP")}
                        </p>
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
                    </div>

                    <div className="grid grid-cols-2 mobilescreen:grid-cols-1 mobilescreen:gap-[0px] gap-[100px]">
                      <div>
                        <p className={FIELD_LABEL_CLASS}>
                          {t("COMMON.EMERGENCY_CONTACT_PHONE")}
                        </p>
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
                          <ModalPhoneInput
                            name="emergency_contact_phone"
                            placeholder={t("COMMON.EMERGENCY_CONTACT_PHONE")}
                            countryCode={values.emergency_contact_country_code}
                          />
                        </div>
                      </div>
                      <div>
                        <p className={FIELD_LABEL_CLASS}>
                          {t("COMMON.EMERGENCY_CONTACT_CIVIL_ID")}
                        </p>
                        <ModalInput
                          name="emergency_contact_civil_id"
                          type="text"
                          placeholder={t("COMMON.EMERGENCY_CONTACT_CIVIL_ID")}
                          maxLength={12}
                          digitsOnly
                        />
                      </div>
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

                <div className="flex xss:flex-col-reverse justify-center gap-5 pt-10">
                  <Button
                    className="xss:!w-full"
                    variant="primary"
                    size="medium"
                    type="submit"
                    disabled={isBusy}
                    loading={registerMutation.isPending}
                  >
                    {t("COMMON.REGISTER")}
                  </Button>
                  <Button
                    className="xss:!w-full"
                    variant="secondary"
                    size="medium"
                    type="button"
                    onClick={onClose}
                    disabled={isBusy}
                  >
                    {t("COMMON.CANCEL")}
                  </Button>
                </div>
              </Form>
            </div>

            <div>
              <p className="font-semibold text-[18px] xss:text-base leading-[24.51px] pt-8 pb-4 text-primary-5 flex items-center w-full before:flex-1 before:border-t before:border-primary-5 before:mr-4 after:flex-1 after:border-t after:border-primary-5 after:ml-4 rtl:gap-[20px]">
                {t("COMMON.OR.BY")}
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
          </div>
        )}
      </Formik>
    </div>
  );
}
