"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Field, FieldArray, Form, Formik, FormikHelpers } from "formik";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FaPlus } from "react-icons/fa";
import * as Yup from "yup";

import Input from "@/components/ui/Input";
import InlineSpinner from "@/components/ui/InlineSpinner";
import PhoneInput from "@/components/ui/PhoneInput";
import SelectInput from "@/components/ui/SelectInput";
import GroupedSelectInput from "@/components/ui/GroupedSelectInput";
import BirthDateField from "@/components/ui/BirthDateField";
import Toggle from "@/components/ui/Toggle";
import { TagsCheckbox } from "@/components/ui/TagsCheckbox";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import {
  checkUserRequest,
  getDropdownChoicesRequest,
} from "@/features/auth/api/authApi";
import {
  getAccountInfo,
  getVolunteerProfile,
  updateAccountInfo,
  updateVolunteerProfile,
} from "@/features/services/api";
import {
  healthConcernOptions,
  nationalityOptions,
  occupationOptions,
  socialMediaOptions,
} from "@/data/Constants";
import {
  formatDateToYYYYMMDD,
  getDefaultProfileImage,
} from "@/lib/helpers";
import {
  YupCivilId,
  YupPhoneNumber,
  YupRequiredString,
  YupStringMaxLength,
} from "@/lib/schema";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import ProfilePictureCropModal from "./ProfilePictureCropModal";

const CountryCodeSelect = dynamic(
  () => import("@/components/ui/CountryCodeSelect"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[48px] rounded-2xl bg-gray-100 animate-pulse mb-4" />
    ),
  }
);

const asset = (path: string) => `/assets/${path}`;

/** Occupations that the design groups under a single "Employee" heading. */
const EMPLOYEE_OCCUPATIONS = [
  "government_employee",
  "accountant",
  "teacher",
  "doctor",
  "nurse",
  "pharmacist",
  "lab_technician",
  "physiotherapist",
  "nutritionist",
  "sports_coach",
  "bank_employee",
  "financial_manager",
  "financial_analyst",
  "graphic_designer",
  "craftsman",
  "writer",
  "journalist",
  "digital_marketer",
  "photographer",
  "content_editor",
  "media_professional",
  "sales_rep",
  "secretary",
  "mechanical_engineer",
  "electrical_engineer",
  "software_engineer",
  "web_developer",
  "network_engineer",
  "project_manager",
  "marketing_manager",
  "hr_manager",
  "architect",
  "civil_engineer",
  "interior_designer",
  "data_engineer",
  "ai_engineer",
  "qa_engineer",
  "lawyer",
  "executive_manager",
];

interface CombinedFormValues {
  email: string;
  phone_number: string;
  country_code: string;
  password: string;
  manual_id: string;
  first_name: string;
  last_name: string;
  documents: File[];
  nickname: string;
  occupation: string;
  experience_field: string;
  _interests: string[];
  health_concerns: string;
  is_public: boolean;
  gender: string;
  nationality: string;
  dob: string;
  civil_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_country_code: string;
  emergency_contact_civil_id: string;
  emergency_contact_relationship: string;
  socialMedia: Array<{ platform: string; link: string }>;
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

const KNOWN_SOCIAL_PLATFORMS = [
  "facebook",
  "twitter",
  "whatsapp",
  "linkedin",
  "instagram",
];

const isValidUrlForPlatform = (platform: string, link: string) => {
  if (!platform || !link) return false;
  const url = link.toLowerCase();
  switch (platform) {
    case "facebook":
      return url.includes("facebook.com");
    case "twitter":
      return url.includes("twitter.com") || url.includes("x.com");
    case "whatsapp":
      return url.includes("whatsapp.com");
    case "linkedin":
      return url.includes("linkedin.com");
    case "instagram":
      return url.includes("instagram.com");
    default:
      return false;
  }
};

export default function VolunteerAccountInformation() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfilePic = useAuthStore((s) => s.updateProfilePic);
  const updateUser = useAuthStore((s) => s.updateUser);
  const authToken = user?.auth_token;
  const selectedLanguage = useLanguageStore((s) => s.language);

  const [componentKey, setComponentKey] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isProfilePicUpdating, setIsProfilePicUpdating] = useState(false);
  const [isOnlyProfilePicChanged, setIsOnlyProfilePicChanged] = useState(false);

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

  // States for image cropping
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const updateAccountMutation = useMutation({ mutationFn: updateAccountInfo });
  const updateProfileMutation = useMutation({
    mutationFn: updateVolunteerProfile,
  });
  const checkUserMutation = useMutation({ mutationFn: checkUserRequest });

  const isUpdatingAccount = updateAccountMutation.isPending;
  const isUpdatingProfile = updateProfileMutation.isPending;

  const {
    data: accountData,
    isLoading: isAccountLoading,
    error: accountError,
    refetch: refetchAccountData,
  } = useQuery({
    queryKey: ["account-info"],
    queryFn: getAccountInfo,
    enabled: Boolean(authToken),
  });

  const {
    data: volunteerProfile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchVolunteerProfile,
  } = useQuery({
    queryKey: ["volunteer-profile"],
    queryFn: getVolunteerProfile,
    enabled: Boolean(authToken),
    refetchOnMount: "always",
  });

  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ["user-interest-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("user_interest"),
    enabled: !!selectedLanguage,
  });

  const { data: genderData, isLoading: genderLoading } = useQuery({
    queryKey: ["gender-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("gender"),
    enabled: !!selectedLanguage,
  });

  const { data: relationshipData, isLoading: relationshipLoading } = useQuery({
    queryKey: ["emergency-contact-relationship-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("emergency_contact_relationship"),
    enabled: !!selectedLanguage,
  });

  const tagOptions =
    tagsData?.data?.map((item: any) => ({
      id: item.id,
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
    })) || [];

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

  const nationalityOpts = nationalityOptions.map((item) => ({
    label: selectedLanguage === "ar" ? item.name_ar : item.name_en,
    value: item.value,
  }));

  const healthConcernOpts = healthConcernOptions.map((item) => ({
    label: selectedLanguage === "ar" ? item.name_ar : item.name_en,
    value: item.value,
  }));

  const localizedOccupation = (item: (typeof occupationOptions)[number]) => ({
    label: selectedLanguage === "ar" ? item.name_ar : item.name_en,
    value: item.value,
  });

  const occupationOpts = [
    // Non-employee options
    ...occupationOptions
      .filter(
        (item) =>
          !item.isHeading &&
          item.value !== "other" &&
          !EMPLOYEE_OCCUPATIONS.includes(item.value)
      )
      .map(localizedOccupation),
    // Employee group
    {
      label: selectedLanguage === "ar" ? "موظف" : "Employee",
      options: occupationOptions
        .filter(
          (item) => !item.isHeading && EMPLOYEE_OCCUPATIONS.includes(item.value)
        )
        .map(localizedOccupation),
    },
    // Other option
    ...occupationOptions
      .filter((item) => item.value === "other")
      .map(localizedOccupation),
  ];

  // Use the centralized helper function for default profile image
  const getDefaultImage = () =>
    getDefaultProfileImage(
      (user as any)?.gender_display?.value_en,
      asset("profile/male_profile.svg"),
      asset("profile/female_profile.svg"),
      asset("profile/org_profile.svg")
    );

  useEffect(() => {
    window.scrollTo(0, 0);
    refetchAccountData();
    refetchVolunteerProfile();
  }, [componentKey, refetchAccountData, refetchVolunteerProfile]);

  useEffect(() => {
    if (accountData?.data?.profile_pic) {
      setProfilePic(accountData.data.profile_pic);
    }
  }, [accountData]);

  const initialValues: CombinedFormValues = {
    email: accountData?.data?.email || "",
    phone_number: accountData?.data?.phone_number || "",
    country_code: accountData?.data?.country_code || "",
    password: accountData?.data?.password || " ",
    manual_id: accountData?.data?.manual_id || user?.id || "",
    first_name: accountData?.data?.first_name || "",
    last_name: accountData?.data?.last_name || "",
    documents: [],
    nickname: volunteerProfile?.data?.nickname ?? "",
    occupation: volunteerProfile?.data?.occupation ?? "",
    experience_field: volunteerProfile?.data?.experience ?? "",
    _interests:
      volunteerProfile?.data?.interest_display?.map(
        (interest: { id: string }) => interest.id
      ) ?? [],
    health_concerns:
      volunteerProfile?.data?.health_concerns === ""
        ? ""
        : volunteerProfile?.data?.health_concerns === "yes"
          ? "yes"
          : "no",
    is_public: volunteerProfile?.data?.is_public ?? true,
    gender: volunteerProfile?.data?.gender_display?.id ?? "",
    nationality: volunteerProfile?.data?.nationality ?? "",
    dob: volunteerProfile?.data?.dob ?? "",
    civil_id: volunteerProfile?.data?.civil_id ?? "",
    emergency_contact_name: accountData?.data?.emergency_contact_name ?? "",
    emergency_contact_phone: accountData?.data?.emergency_contact_phone ?? "",
    emergency_contact_country_code:
      accountData?.data?.emergency_contact_country_code ?? "",
    emergency_contact_civil_id:
      accountData?.data?.emergency_contact_civil_id ?? "",
    emergency_contact_relationship:
      accountData?.data?.emergency_contact_relationship_display?.id ?? "",
    socialMedia:
      volunteerProfile?.data?.socialMedia?.length > 0
        ? volunteerProfile.data.socialMedia
        : [{ platform: "", link: "" }],
  };

  const validationSchema = Yup.object({
    phone_number: YupPhoneNumber,
    first_name: Yup.string()
      .required(t("COMMON.REQUIRED.FIELD"))
      .min(2, t("COMMON.FIRST_NAME_MIN_LENGTH"))
      .max(100, t("COMMON.FIRST_NAME_MAX_LENGTH"))
      .matches(/^[A-Za-z\s]+$/, t("COMMON.ENGLISH_ONLY")),
    last_name: Yup.string()
      .required(t("COMMON.REQUIRED.FIELD"))
      .min(2, t("COMMON.LAST_NAME_MIN_LENGTH"))
      .max(100, t("COMMON.LAST_NAME_MAX_LENGTH"))
      .matches(/^[A-Za-z\s]+$/, t("COMMON.ENGLISH_ONLY")),
    nickname: Yup.string()
      .required(t("COMMON.REQUIRED.FIELD"))
      .matches(/^[A-Za-z0-9._]+$/, t("COMMON.ENGLISH_ONLY"))
      .test("nickname-availability", t("COMMON.USERNAME_TAKEN"), function () {
        if (
          !this.parent.nickname ||
          this.parent.nickname === initialValues.nickname
        ) {
          return true;
        }
        return nicknameAvailability.available !== false;
      }),
    dob: Yup.date().nullable(),
    civil_id: YupCivilId,
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
    socialMedia: Yup.array()
      .of(
        Yup.object()
          .shape({
            platform: Yup.string(),
            link: Yup.string().test(
              "url-format",
              t("COMMON.INVALID.URL"),
              function (value) {
                if (!value) return true;
                return Yup.string().url().isValidSync(value);
              }
            ),
          })
          .test(
            "platform-link-dependency",
            "Platform and link must both be filled or both be empty",
            function (value) {
              const { platform, link } = value;
              if (!platform && !link) return true;
              if (!platform && link) {
                return this.createError({
                  path: `${this.path}.platform`,
                  message: t("COMMON.SOCIAL_MEDIA.PLATFORM_REQUIRED"),
                });
              }
              if (platform && !link) {
                return this.createError({
                  path: `${this.path}.link`,
                  message: t("COMMON.REQUIRED.FIELD"),
                });
              }
              // Unrecognised platforms are left alone; only the known ones
              // have a host to check against.
              if (
                platform &&
                link &&
                KNOWN_SOCIAL_PLATFORMS.includes(platform) &&
                !isValidUrlForPlatform(platform, link)
              ) {
                return this.createError({
                  path: `${this.path}.link`,
                  message: t("COMMON.INVALID.URL_FORMAT"),
                });
              }
              return true;
            }
          )
      )
      .test(
        "all-social-media-valid",
        t("COMMON.SOCIAL_MEDIA.ATLEAST_ONE"),
        function (value) {
          if (!value || value.length === 0) return true;
          const validFields = value.filter(
            (sm) =>
              (!sm.platform && !sm.link) ||
              (sm.platform &&
                sm.link &&
                Yup.string().url().isValidSync(sm.link) &&
                isValidUrlForPlatform(sm.platform, sm.link))
          );
          return validFields.length === value.length;
        }
      ),
  });

  // Handle file selection for cropping
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      // Create a URL for the image to be used in the cropper
      setSelectedImage(URL.createObjectURL(file));
      setShowCropModal(true);
    }
  };

  // Handle crop completion
  const handleCropComplete = async (croppedFile: File) => {
    try {
      setIsProfilePicUpdating(true);
      setIsOnlyProfilePicChanged(true);

      const formData = new FormData();
      formData.append("profile_pic", croppedFile);

      const response = await updateAccountMutation.mutateAsync(formData);
      setUploadError(null);
      setComponentKey((prev) => prev + 1);
      toast.success(t("COMMON.TOAST.PROFILE_PIC_UPDATE_SUCCESSFULLY"));

      const imageUrl = URL.createObjectURL(croppedFile);
      setProfilePic(imageUrl);
      updateProfilePic(response?.data?.profile_pic || imageUrl);

      // Close crop modal
      setShowCropModal(false);
      setSelectedImage(null);

      router.push("/volunteer-profile");
    } catch {
      setUploadError(t("COMMON.TOAST.PROFILE_PIC_UPDATE_FAILED"));
    } finally {
      setIsProfilePicUpdating(false);
    }
  };

  // Debounced nickname availability check
  const checkNicknameAvailability = useCallback(
    async (nickname: string, currentNickname: string) => {
      if (nicknameCheckTimeoutRef.current) {
        clearTimeout(nicknameCheckTimeoutRef.current);
      }

      if (!nickname || nickname.trim() === "" || nickname === currentNickname) {
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
    values: CombinedFormValues,
    { resetForm, setFieldError }: FormikHelpers<CombinedFormValues>
  ) => {
    try {
      let hasAccountChanges = false;
      const accountFormData = new FormData();

      if (values.phone_number !== accountData?.data?.phone_number) {
        accountFormData.append("phone_number", values.phone_number);
        hasAccountChanges = true;
      }

      if (values.country_code !== accountData?.data?.country_code) {
        accountFormData.append("country_code", values.country_code);
        hasAccountChanges = true;
      }

      if (values.first_name !== accountData?.data?.first_name) {
        accountFormData.append("first_name", values.first_name.trim());
        hasAccountChanges = true;
      }

      if (values.last_name !== accountData?.data?.last_name) {
        accountFormData.append("last_name", values.last_name.trim());
        hasAccountChanges = true;
      }

      const under18 = isUnderage(values.dob);

      const emergencyFields = [
        "emergency_contact_name",
        "emergency_contact_phone",
        "emergency_contact_country_code",
        "emergency_contact_civil_id",
        "emergency_contact_relationship",
      ] as const;

      emergencyFields.forEach((field) => {
        const newValue = under18 ? (values[field] ?? "") : "";
        const currentValue =
          field === "emergency_contact_relationship"
            ? (accountData?.data?.emergency_contact_relationship_display?.id ??
              "")
            : (accountData?.data?.[field] ?? "");
        if (String(newValue) !== String(currentValue)) {
          accountFormData.append(field, String(newValue));
          hasAccountChanges = true;
        }
      });

      const socialMediaMap = new Map<string, string>();
      values.socialMedia?.forEach((sm) => {
        if (sm.platform && (sm.link || sm.link === "")) {
          socialMediaMap.set(sm.platform, sm.link);
        }
      });

      const socialMediaFields: Record<string, string> = {};
      socialMediaOptions.forEach((option) => {
        const link = socialMediaMap.get(option.value) ?? "";
        switch (option.value) {
          case "facebook":
            socialMediaFields.facebook_link = link;
            break;
          case "twitter":
            socialMediaFields.twitter_link = link;
            break;
          case "whatsapp":
            socialMediaFields.whatsapp_link = link;
            break;
          case "linkedin":
            socialMediaFields.linkedin_link = link;
            break;
          case "instagram":
            socialMediaFields.instagram_link = link;
            break;
          default:
            break;
        }
      });

      const profileData: Record<string, unknown> = {
        nickname: values.nickname,
        occupation: values.occupation,
        experience: values.experience_field,
        health_concerns: values.health_concerns || "no",
        _interests: values._interests,
        is_public: values.is_public,
        gender: values.gender,
        nationality: values.nationality,
        civil_id: values.civil_id,
        ...socialMediaFields,
        // Only send a real date when one is provided
        dob: values.dob ? formatDateToYYYYMMDD(values.dob) : null,
      };

      const hasProfileChanges = Object.keys(profileData).some(
        (key) =>
          JSON.stringify(profileData[key]) !==
          JSON.stringify(volunteerProfile?.data?.[key] ?? "")
      );

      if (hasAccountChanges) {
        const accountResponse =
          await updateAccountMutation.mutateAsync(accountFormData);
        if (
          accountResponse?.data?.profile_pic &&
          accountResponse.data.profile_pic !== user?.profile_pic
        ) {
          updateProfilePic(accountResponse.data.profile_pic);
        }

        // Keep the cached user in sync with the new name
        if (
          values.first_name !== accountData?.data?.first_name ||
          values.last_name !== accountData?.data?.last_name
        ) {
          updateUser({
            first_name: values.first_name,
            last_name: values.last_name,
          });
        }
      }

      if (hasProfileChanges) {
        let profileResponse;
        try {
          profileResponse =
            await updateProfileMutation.mutateAsync(profileData);
        } catch (profileErr: any) {
          const apiErrors = profileErr?.response?.data?.errors;
          if (apiErrors && typeof apiErrors === "object") {
            Object.entries(apiErrors).forEach(
              ([field, messages]: [string, any]) => {
                const errorMessage =
                  selectedLanguage === "ar"
                    ? messages?.ar ||
                      messages?.en ||
                      t("COMMON.TOAST.PROFILE_UPDATE_FAILED")
                    : messages?.en || t("COMMON.TOAST.PROFILE_UPDATE_FAILED");
                setFieldError(field, errorMessage);
              }
            );
          } else {
            toast.error(t("COMMON.TOAST.PROFILE_UPDATE_FAILED"));
          }
          return;
        }

        // Mirror a gender change into the cached user
        if (
          profileResponse?.data?.gender_display &&
          values.gender !== volunteerProfile?.data?.gender_display?.id
        ) {
          updateUser({
            gender_display: {
              id: parseInt(values.gender),
              choice_type: "gender",
              value_en:
                genderOptions.find(
                  (option: any) => option.value === parseInt(values.gender)
                )?.label || "",
              value_ar:
                genderData?.data?.find(
                  (item: any) => item.id === parseInt(values.gender)
                )?.value_ar || "",
            },
          } as any);
        }
      }

      if (hasAccountChanges || hasProfileChanges) {
        toast.success(t("COMMON.TOAST.PROFILE_UPDATED_SUCCESSFULLY"));
        setComponentKey((prev) => prev + 1);
        resetForm();
        setIsOnlyProfilePicChanged(false);
        router.push("/volunteer-profile");
      } else {
        toast.info(t("COMMON.TOAST.NO_CHANGES"));
      }
    } catch (err) {
      console.error("Update failed:", err);
      toast.error(t("COMMON.TOAST.PROFILE_UPDATE_FAILED"));
    }
  };

  const handleCopyId = (manualId: string) => {
    navigator.clipboard
      .writeText(manualId)
      .then(() => toast.success(t("COMMON.TOAST.ID_COPIED_SUCCESSFULLY")))
      .catch((err) => {
        console.error("Failed to copy ID:", err);
        toast.error(t("COMMON.TOAST.ID_COPY_FAILED"));
      });
  };

  if (!authToken) return <div>{t("COMMON.PLEASE_LOGIN")}</div>;
  if (isAccountLoading || isProfileLoading) return <Loader />;
  if (accountError || profileError) {
    return (
      <div>
        {t("COMMON.ERROR")}: {String(accountError || profileError)}
      </div>
    );
  }

  return (
    <div className="border-t border-[#000]">
      {/* Render Crop Modal when image is selected */}
      {showCropModal && selectedImage && (
        <ProfilePictureCropModal
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false);
            setSelectedImage(null);

            // Clear the file input so re-picking the same file still fires change
            document
              .querySelectorAll('input[type="file"]')
              .forEach((input) => {
                (input as HTMLInputElement).value = "";
              });
          }}
        />
      )}

      <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]">
        <h2 className="font-bold 2xl:text-[50px] lg:text-[32px] text-[24px] text-primary-5">
          {t("COMMON.ACCOUNT_INFORMATION")}
        </h2>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
          validateOnBlur
          validateOnChange
          validateOnMount={false}
        >
          {({
            values,
            setFieldValue,
            setFieldTouched,
            isValid,
            errors,
            touched,
            dirty,
            resetForm,
          }) => {
            const isSocialMediaTouched =
              Array.isArray(touched.socialMedia) &&
              touched.socialMedia.some(
                (field) => field?.platform || field?.link
              );
            const under18 = isUnderage(values.dob);

            return (
              <div className="flex justify-center">
                <div className="w-[90%] 2xl:w-[1200px] lg:w-[1000px] md:w-[90%] 2xl:pt-12 lg:pt-5 pt-5 relative">
                  <Form className="relative">
                    {(isUpdatingAccount || isUpdatingProfile) &&
                      !isProfilePicUpdating && (
                        <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75 z-10">
                          <Loader />
                        </div>
                      )}

                    {/* Account Information Section */}
                    <div>
                      <div className="relative w-[168px] h-[168px] mx-auto">
                        <Image
                          src={profilePic || getDefaultImage()}
                          alt="Profile"
                          fill
                          unoptimized
                          className="rounded-full border-[5px] border-[#29246D] object-cover"
                        />
                        <div className="absolute bottom-2 right-2">
                          <input
                            type="file"
                            id="fileUpload"
                            name="profile_pic_file"
                            className="hidden"
                            accept="image/png"
                            onChange={handleFileChange}
                          />
                          <label htmlFor="fileUpload" className="cursor-pointer">
                            <Image
                              src={asset("profile/uploadicon1.svg")}
                              alt="Upload"
                              width={30}
                              height={30}
                              className="w-[30px] h-[30px]"
                            />
                          </label>
                          {uploadError && (
                            <p className="text-red-500 text-sm mt-2">
                              {uploadError}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-center pt-5 2xl:pb-[50px] lg:pb-[10px] pb-[20px]">
                        <div className="text-primary-5 font-bold text-[25px] mb-2">
                          {values.first_name} {values.last_name}
                        </div>
                      </div>

                      <div className="flex mobilescreen:gap-2 mobilescreen:flex-col gap-4">
                        <div className="relative flex-1">
                          <Input
                            name="first_name"
                            type="text"
                            label={t("COMMON.FIRSTNAMEPLACEHOLDER")}
                            className="pr-10"
                          />
                        </div>
                        <div className="relative flex-1">
                          <Input
                            name="last_name"
                            type="text"
                            label={t("COMMON.LASTNAMEPLACEHOLDER")}
                            className="pr-10"
                          />
                        </div>
                      </div>

                      <div className="flex mobilescreen:gap-2 mobilescreen:flex-col gap-4">
                        <div className="relative flex-1">
                          <Input
                            name="email"
                            type="text"
                            label={t("COMMON.EMAIL")}
                            value={accountData?.data?.email || ""}
                            disabled
                            className="pr-10"
                          />
                        </div>
                        <div className="relative flex-1">
                          <div className="flex gap-2">
                            <div>
                              <CountryCodeSelect
                                name="country_code"
                                className="w-full"
                                initialValue={
                                  accountData?.data?.country_code || ""
                                }
                                onChange={(value: string) =>
                                  setFieldValue("country_code", value)
                                }
                              />
                            </div>
                            <div className="w-full">
                              <PhoneInput
                                name="phone_number"
                                label={t("COMMON.PHONE_NUMBER")}
                                className="pr-10"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex mobilescreen:gap-0 mobilescreen:flex-col gap-4">
                        <div className="relative flex-1">
                          <Input
                            name="civil_id"
                            type="text"
                            label={t("COMMON.CIVIL_ID")}
                            maxLength={12}
                          />
                        </div>
                        <div className="relative flex-1">
                          <Input
                            name="manual_id"
                            type="text"
                            label={t("COMMON.ID")}
                            value={
                              accountData?.data?.manual_id || user?.id || ""
                            }
                            disabled
                            className="ltr:pr-16 rtl:pl-16"
                          />
                          <span
                            onClick={() =>
                              handleCopyId(
                                String(
                                  accountData?.data?.manual_id || user?.id || ""
                                )
                              )
                            }
                            className="absolute ltr:right-0 rtl:left-0 top-[37%] transform -translate-y-1/2 text-primary-5 border-b border-primary-5/15 ltr:mr-5 rtl:ml-5 cursor-pointer"
                          >
                            {t("COMMON.COPY")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Personal Details Section */}
                    <div className="flex mobilescreen:flex-col gap-4 mobilescreen:gap-0">
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
                          onChange={(e) => {
                            setFieldValue("nickname", e.target.value);
                            checkNicknameAvailability(
                              e.target.value,
                              initialValues.nickname || ""
                            );
                          }}
                        />
                        {values.nickname &&
                          values.nickname !== initialValues.nickname &&
                          !errors.nickname && (
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
                      <GroupedSelectInput
                        name="occupation"
                        label={t("COMMON.ENTER.OCCIPATION")}
                        options={occupationOpts}
                        onChange={(selectedOption) =>
                          setFieldValue("occupation", selectedOption?.value || "")
                        }
                      />
                    </div>

                    <div className="flex mobilescreen:flex-col gap-4 mobilescreen:gap-0 selectfiled">
                      <SelectInput
                        name="gender"
                        label={t("COMMON.GENDERPLACEHOLDER")}
                        options={genderOptions}
                        onChange={(selectedOption) =>
                          setFieldValue("gender", selectedOption?.value || "")
                        }
                        disabled={genderLoading}
                      />
                      <SelectInput
                        name="nationality"
                        label={t("COMMON.SELECT.NATIONALITY")}
                        options={nationalityOpts}
                        onChange={(selectedOption) =>
                          setFieldValue(
                            "nationality",
                            selectedOption?.value || ""
                          )
                        }
                      />
                    </div>

                    <div className="flex mobilescreen:flex-col gap-4 mobilescreen:gap-0 selectfiled">
                      <BirthDateField
                        name="dob"
                        label={t("COMMON.DATE_OF_BIRTH")}
                        maxDate={new Date()}
                      />
                      <SelectInput
                        name="health_concerns"
                        label={t("COMMON.HEALTH.CONCERNS")}
                        options={healthConcernOpts}
                        onChange={(selectedOption) =>
                          setFieldValue(
                            "health_concerns",
                            selectedOption?.value || ""
                          )
                        }
                      />
                    </div>

                    <div className="flex mobilescreen:flex-col gap-4 mobilescreen:gap-0">
                      <TagsCheckbox
                        name="_interests"
                        label={t("COMMON.ENTER_TAGS")}
                        setFieldValue={setFieldValue}
                        setFieldTouched={setFieldTouched}
                        values={values._interests}
                        errors={errors._interests as string | undefined}
                        touched={touched._interests as boolean | undefined}
                        options={tagOptions}
                        disabled={tagsLoading}
                      />
                    </div>

                    <FieldArray name="socialMedia">
                      {({ push, remove }) => (
                        <>
                          {values.socialMedia?.map((_, index) => {
                            const socialErrors = errors.socialMedia as any;
                            const socialTouched = touched.socialMedia as any;
                            const hasRowError =
                              socialErrors &&
                              typeof socialErrors !== "string" &&
                              (socialErrors[index]?.platform ||
                                socialErrors[index]?.link);

                            return (
                              <div
                                key={`social-media-${index}`}
                                className={`flex mobilescreen:flex-col gap-4 mobilescreen:gap-[0px] selectfiled items-center ${
                                  hasRowError ? "mb-1" : ""
                                }`}
                              >
                                <div className="w-full relative">
                                  <SelectInput
                                    name={`socialMedia[${index}].platform`}
                                    label={t("COMMON.SOCIAL.MEDIA")}
                                    isClearable
                                    options={socialMediaOptions
                                      .filter(
                                        (option) =>
                                          !(values.socialMedia ?? []).some(
                                            (sm, i) =>
                                              i !== index &&
                                              sm.platform === option.value
                                          )
                                      )
                                      .map((option) => ({
                                        label:
                                          selectedLanguage === "ar"
                                            ? option.name_ar
                                            : option.name_en,
                                        value: option.value,
                                      }))}
                                    onChange={(selectedOption) => {
                                      const newPlatform =
                                        selectedOption?.value || "";
                                      setFieldValue(
                                        `socialMedia[${index}].platform`,
                                        newPlatform
                                      );
                                      setFieldTouched(
                                        `socialMedia[${index}].platform`,
                                        true
                                      );

                                      if (!newPlatform) {
                                        if (
                                          values.socialMedia &&
                                          values.socialMedia.length > 1
                                        ) {
                                          remove(index);
                                        } else {
                                          setFieldValue(
                                            `socialMedia[${index}]`,
                                            { platform: "", link: "" }
                                          );
                                        }
                                      }
                                    }}
                                  />
                                  {socialTouched?.[index]?.platform &&
                                    socialErrors &&
                                    typeof socialErrors !== "string" &&
                                    socialErrors[index]?.platform && (
                                      <div className="text-red-500 text-sm absolute -bottom-5 left-0">
                                        {socialErrors[index].platform}
                                      </div>
                                    )}
                                </div>

                                <div className="w-full relative">
                                  <Input
                                    name={`socialMedia[${index}].link`}
                                    type="text"
                                    label={t("COMMON.ENTER.LINK")}
                                    hideError
                                    onChange={(e) => {
                                      setFieldValue(
                                        `socialMedia[${index}].link`,
                                        e.target.value
                                      );
                                      setFieldTouched(
                                        `socialMedia[${index}].link`,
                                        true
                                      );
                                    }}
                                    onBlur={() =>
                                      setFieldTouched(
                                        `socialMedia[${index}].link`,
                                        true
                                      )
                                    }
                                    className="h-[48px]"
                                  />
                                  {socialTouched?.[index]?.link &&
                                    socialErrors &&
                                    typeof socialErrors !== "string" &&
                                    socialErrors[index]?.link && (
                                      <div className="text-red-500 text-sm absolute -bottom-1 left-1">
                                        {socialErrors[index].link}
                                      </div>
                                    )}
                                </div>

                                {index ===
                                  (values.socialMedia?.length ?? 0) - 1 &&
                                (values.socialMedia?.length ?? 0) <
                                  socialMediaOptions.length ? (
                                  <div className="flex justify-center items-center h-[48px] mt-0 mobilescreen:mt-0 w-[40px] pb-[13px]">
                                    <FaPlus
                                      size={20}
                                      onClick={() =>
                                        push({ platform: "", link: "" })
                                      }
                                      className="text-[#29246d] hover:cursor-pointer"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-[40px]" />
                                )}
                              </div>
                            );
                          })}
                          {isSocialMediaTouched &&
                            typeof errors.socialMedia === "string" && (
                              <div className="text-red-500 text-sm mt-2">
                                {errors.socialMedia}
                              </div>
                            )}
                        </>
                      )}
                    </FieldArray>

                    {/* Emergency Contact Fields - Only shown if user is under 18 */}
                    {under18 && (
                      <>
                        <div className="mt-2 mb-4">
                          <h3 className="text-lg font-semibold text-primary-5">
                            {t("COMMON.EMERGENCY_CONTACT_DETAILS")}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {t("COMMON.EMERGENCY_CONTACT_REQUIRED_UNDER_18")}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 mobilescreen:grid-cols-1 mobilescreen:gap-0 gap-6 selectfiled">
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
                                selectedOption?.value ?? ""
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
                              <PhoneInput
                                name="emergency_contact_phone"
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

                    <div className="w-[100%] pt-4">
                      <Field name="is_public">
                        {({ field }: { field: any }) => (
                          <Toggle
                            label={t("COMMON.ACCOUNT.PRIVATE")}
                            checked={!field.value}
                            onChange={() =>
                              setFieldValue("is_public", !field.value)
                            }
                          />
                        )}
                      </Field>
                    </div>

                    {/* Submit and Cancel Buttons */}
                    <div className="flex justify-center gap-[28px] 2xl:pt-8 lg:pt-3 pt-3">
                      <Button
                        variant="primary"
                        size="medium"
                        type="submit"
                        disabled={
                          isUpdatingAccount ||
                          isUpdatingProfile ||
                          !isValid ||
                          !dirty ||
                          isOnlyProfilePicChanged
                        }
                      >
                        {t("COMMON.SAVE")}
                      </Button>
                      <Button
                        variant="secondary"
                        size="medium"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          resetForm();
                          setIsOnlyProfilePicChanged(false);
                        }}
                        disabled={!dirty && !isOnlyProfilePicChanged}
                      >
                        {t("COMMON.CANCEL")}
                      </Button>
                    </div>
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
