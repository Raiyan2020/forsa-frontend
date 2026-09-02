"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Formik, Form, FormikHelpers, FormikProps } from "formik";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import Input from "@/components/ui/Input";
import InlineSpinner from "@/components/ui/InlineSpinner";
import PhoneInput from "@/components/ui/PhoneInput";
import Button from "@/components/ui/Button";
import UploadInput from "@/components/ui/UploadInput";
import CheckBox from "@/components/ui/CheckBox";
import SelectInput from "@/components/ui/SelectInput";
import {
  checkUserRequest,
  getDropdownChoicesRequest,
  passSocialInfoRequest,
} from "@/features/auth/services/authApi";
import { getApiErrorMessages, isApiSuccess } from "@/lib/api/errors";
import { YupPhoneNumber, YupRequiredString, YupStringMaxLength, YupDigitsOnlyOptional, createPhoneNumberSchema } from "@/features/shared/schemas";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import {
  OAUTH_USER_KEY,
  applyPrefill,
  clearSocialSignupState,
  takeSocialPrefill,
} from "@/lib/auth/socialSignup";
import { isLicenseExemptOrgType } from "@/data/orgTypes";
import { NAV_STATE_KEYS, takeNavState } from "@/lib/navigationState";

const CountryCodeSelect = dynamic(
  () => import("@/components/ui/CountryCodeSelect"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[48px] rounded-2xl bg-gray-100 animate-pulse mb-4" />
    ),
  }
);

interface SocialUserData {
  email?: string;
  first_name?: string;
  last_name?: string;
  social_media_provider?: string;
  social_media_id?: string;
  social_profile_pic_url?: string;
}

interface CompleteDetailsValues {
  organizer_type: string;
  phone_number: string;
  country_code: string;
  documents: File[];
  license_number: string;
  company_name: string;
  nickname: string;
  latitude: string;
  longitude: string;
  termsAccepted: boolean;
}

export default function CompleteDetails() {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const setUser = useAuthStore((s) => s.setUser);

  // The OAuth payload arrived via `location.state` in the React app; the login
  // and sign-up screens now stash it in sessionStorage before navigating here.
  const [userData, setUserData] = useState<SocialUserData | null>(null);

  // Answers already typed into the organizer sign-up form before the visitor
  // clicked Google / LinkedIn, so they are not asked for a second time. The
  // certificate is the exception — a File cannot survive sessionStorage.
  const [prefill, setPrefill] = useState<Record<string, unknown> | null>(null);

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

  // Read once and consume: the JoinUs "Volunteer Team" shortcut sets this
  // right before pushing here. `useState`'s lazy initializer runs
  // synchronously during the first render, so the flag is settled before it's
  // needed below — no effect-timing race.
  const [isVolunteerTeamJoin] = useState(
    () => !!takeNavState<boolean>(NAV_STATE_KEYS.joinAsVolunteerTeam)
  );
  const volunteerTeamPrefilled = useRef(false);
  const formikRef = useRef<FormikProps<CompleteDetailsValues> | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    try {
      const stored = sessionStorage.getItem(OAUTH_USER_KEY);
      if (stored) setUserData(JSON.parse(stored));
    } catch {
      // No stashed payload — the form still submits, just without social fields.
    }
    // Reads once and drops the stash, so StrictMode's second pass finds
    // nothing and must not clear what the first pass picked up.
    const parked = takeSocialPrefill("organization");
    if (parked) setPrefill(parked);
  }, []);

  const { data: orgTypeData, isLoading: orgTypeLoading } = useQuery({
    queryKey: ["org-type-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("org_type"),
    enabled: !!selectedLanguage,
  });

  // Transform API responses into options for SelectInput
  const orgTypeOptions = useMemo(
    () =>
      orgTypeData?.data?.map((item: any) => ({
        label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
        value: String(item.id), // Use id as string
        rawValue: item.value_en,
      })) || [],
    [orgTypeData, selectedLanguage]
  );

  // The visible dropdown never offers "Volunteer Team" — that path only ever
  // reaches this form via the dedicated JoinUs shortcut, which skips the
  // field entirely and sets the value in the background instead.
  const visibleOrgTypeOptions = useMemo(
    () =>
      orgTypeOptions.filter(
        (o: (typeof orgTypeOptions)[number]) => o.rawValue !== "Volunteer Team"
      ),
    [orgTypeOptions]
  );

  // The "Volunteer Team" org_type choice is backend-driven and only known
  // once orgTypeOptions loads, so this can't be a Formik initialValue — it's
  // applied imperatively, once, as soon as the matching option arrives.
  useEffect(() => {
    if (!isVolunteerTeamJoin || volunteerTeamPrefilled.current) return;
    const volunteerTeam = orgTypeOptions.find(
      (o: (typeof orgTypeOptions)[number]) => o.rawValue === "Volunteer Team"
    );
    if (!volunteerTeam) return;
    volunteerTeamPrefilled.current = true;
    formikRef.current?.setFieldValue("organizer_type", volunteerTeam.value);
  }, [isVolunteerTeamJoin, orgTypeOptions]);

  const initialValues: CompleteDetailsValues = applyPrefill(
    {
      organizer_type: "", // Empty by default to enforce selection
      phone_number: "",
      country_code: "",
      documents: [],
      license_number: "",
      company_name: "",
      nickname: "",
      latitude: "",
      longitude: "",
      termsAccepted: false,
    },
    prefill
  );

  const validationSchema = Yup.object({
    organizer_type: Yup.string().concat(YupRequiredString),
    // Make license_number optional for public organizations
    license_number: YupDigitsOnlyOptional(100).when(
      "organizer_type",
      (organizer_type: any, schema: any) => {
        const organizerTypeValue = Array.isArray(organizer_type)
          ? organizer_type[0]
          : organizer_type;
        const selected = orgTypeOptions.find(
          (o: any) => String(o.value) === String(organizerTypeValue)
        );
        const isPublic = isLicenseExemptOrgType(selected?.rawValue);
        return isPublic
          ? schema.notRequired()
          : schema.required(t("COMMON.REQUIRED.FIELD"));
      }
    ),
    company_name: YupStringMaxLength(100).concat(YupRequiredString),
    nickname: YupStringMaxLength(50)
      .matches(/^[A-Za-z0-9._]+$/, t("COMMON.ENGLISH_ONLY"))
      .test("nickname-availability", t("COMMON.USERNAME_TAKEN"), function () {
        if (!this.parent.nickname) return true;
        return nicknameAvailability.available !== false;
      }),
    phone_number: Yup.string().when("country_code", (country_code: any, schema: any) => {
      const code = Array.isArray(country_code) ? country_code[0] : country_code;
      return createPhoneNumberSchema(code);
    }),
    country_code: Yup.string().concat(YupRequiredString),
    // Uploaded license is optional for public organizations; validate sizes when present
    documents: Yup.array().test(
      "fileSizeAndRequired",
      t("COMMON.FILE.TOO.LARGE"),
      function (files) {
        const organizer_type = this.parent?.organizer_type;
        const selected = orgTypeOptions.find(
          (o: any) => String(o.value) === String(organizer_type)
        );
        const isPublic = isLicenseExemptOrgType(selected?.rawValue);

        if (isPublic) {
          if (!files || files.length === 0) return true;
          return files.every(
            (file: any) => file instanceof File && file.size <= 2 * 1024 * 1024
          );
        }

        if (!files || files.length === 0) {
          return this.createError({
            message: t("COMMON.REQUIRED.FIELD") || t("COMMON.FILE.TOO.LARGE"),
          });
        }
        return files.every(
          (file: any) => file instanceof File && file.size <= 2 * 1024 * 1024
        );
      }
    ),
    termsAccepted: Yup.boolean()
      .required(t("COMMON.REQUIRED.FIELD"))
      .oneOf([true], t("COMMON.TERMS_ACCEPTANCE_REQUIRED")),
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
    values: CompleteDetailsValues,
    { resetForm }: FormikHelpers<CompleteDetailsValues>
  ) => {
    const formData = new FormData();

    formData.append("phone_number", values.phone_number ?? "");
    formData.append("country_code", values.country_code ?? "");
    formData.append("organizer_type", values.organizer_type ?? "");
    formData.append("license_number", values.license_number ?? "");
    formData.append("company_name", values.company_name ?? "");
    if (values.nickname) {
      formData.append("nickname", values.nickname);
    }
    formData.append("user_type", "organization");
    formData.append("latitude", values.latitude ?? "");
    formData.append("longitude", values.longitude ?? "");
    formData.append("preferred_language", selectedLanguage);

    // Append social media data from userData
    if (userData) {
      formData.append("email", userData.email ?? "");
      formData.append("first_name", userData.first_name ?? "");
      formData.append("last_name", userData.last_name ?? "");
      formData.append(
        "social_media_provider",
        userData.social_media_provider ?? ""
      );
      formData.append("social_media_id", userData.social_media_id ?? "");
      formData.append(
        "social_profile_pic_url",
        userData.social_profile_pic_url ?? ""
      );
    }

    // Append multiple documents
    if (values.documents) {
      for (let i = 0; i < values.documents.length; i++) {
        formData.append("documents[]", values.documents[i]);
      }
    }

    try {
      const response = await passSocialInfoMutation.mutateAsync(formData);
      if (!isApiSuccess(response)) {
        toast.error(
          response?.msg || t("COMMON.TOAST.PROFILE_COMPLETION_FAILED")
        );
        return;
      }
      setUser(response.data);
      clearSocialSignupState();
      toast.success(t("COMMON.TOAST.PROFILE_COMPLETION"));
      resetForm();
      router.push("/");
    } catch (err: any) {
      const messages = getApiErrorMessages(err, selectedLanguage);
      if (messages.length > 0) {
        messages.forEach((message) => toast.error(message));
      } else {
        toast.error(t("COMMON.TOAST.PROFILE_COMPLETION_FAILED"));
      }
    }
  };

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]">
        <h2 className="2xl:pb-11 lg:pb-5 pb-5 text-center font-bold xs:text-[22px] xs:leading-[26px] text-[28px] leading-[48px] md:text-[32px] md:leading-[52px] lg:text-[30px] lg:leading-[60px] 2xl:text-[50px] xl:leading-[68.09px] tracking-[0px] text-[#29246D]">
          {t(
            isVolunteerTeamJoin
              ? "COMMON.CREATE_ACCOUNT_VOLUNTEER_TEAM"
              : "COMMON.COMPLETEYOURDETAILS"
          )}
        </h2>
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          // The parked answers land after mount, one render behind the form.
          enableReinitialize
        >
          {({ setFieldValue, values, errors, touched }) => (
            <div className="flex justify-center">
              <div className="w-[90%] 2xl:w-[720px] lg:w-[720px] md:w-[90%] rounded-lg bg-white">
                <Form>
                  <div
                    className={`grid ${
                      isVolunteerTeamJoin ? "grid-cols-1" : "grid-cols-2"
                    } mobilescreen:grid-cols-1 mobilescreen:gap-0 gap-6 xs:block selectfiled`}
                  >
                    {!isVolunteerTeamJoin && (
                      <SelectInput
                        name="organizer_type"
                        label={t("COMMON.ORGANIZER.TYPE")}
                        options={visibleOrgTypeOptions}
                        onChange={(selectedOption) =>
                          setFieldValue(
                            "organizer_type",
                            String(selectedOption?.value ?? "")
                          )
                        }
                        disabled={orgTypeLoading}
                      />
                    )}
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
                          countryCode={values.country_code}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6 xs:block xs:gap-y-6">
                    <Input
                      name="company_name"
                      type="text"
                      label={t("COMMON.ENTER_FULL_NAME")}
                    />
                  </div>
                  <div className="flex gap-6 xs:block xs:gap-y-6">
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
                  </div>
                  <div className="flex gap-6 xs:block xs:gap-y-6">
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
                    disabled={passSocialInfoMutation.isPending}
                    loading={passSocialInfoMutation.isPending}
                  >
                    {t("COMMON.SUBMIT")}
                  </Button>
                </Form>
              </div>
            </div>
          )}
        </Formik>
      </div>
    </div>
  );
}
