"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FieldArray, Form, Formik, FormikHelpers } from "formik";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FaPlus } from "react-icons/fa";
import * as Yup from "yup";

import Input from "@/components/ui/Input";
import InlineSpinner from "@/components/ui/InlineSpinner";
import PhoneInput from "@/components/ui/PhoneInput";
import SelectInput from "@/components/ui/SelectInput";
import UploadInput from "@/components/ui/UploadInput";
import { TagsCheckbox } from "@/components/ui/TagsCheckbox";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import {
  checkUserRequest,
  getDropdownChoicesRequest,
} from "@/features/auth/api/authApi";
import {
  getAccountInfo,
  getOrganizerProfile,
  updateAccountInfo,
  updateOrganizerDocuments,
  updateOrganizerProfile,
} from "@/features/services/api";
import { socialMediaOptions } from "@/data/Constants";
import { isLicenseExemptOrgType } from "@/data/orgTypes";
import { withCacheBust } from "@/lib/helpers";
import { YupPhoneNumber, YupDigitsOnlyOptional, createPhoneNumberSchema } from "@/lib/schema";
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

interface CombinedOrganizerFormValues {
  email: string;
  phone_number: string;
  country_code: string;
  password: string;
  manual_id: string;
  documents: File[];
  company_name: string;
  nickname: string;
  license_number: string;
  sector: string;
  organizer_type: string;
  _interests: string[];
  socialMedia: Array<{ platform: string; link: string }>;
}

export default function OrganizerAccountInformation() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfilePic = useAuthStore((s) => s.updateProfilePic);
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

  // Kept existing document IDs (for the documents PUT endpoint)
  const [keptDocIds, setKeptDocIds] = useState<number[]>([]);

  // States for image cropping
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateAccountMutation = useMutation({ mutationFn: updateAccountInfo });
  const updateProfileMutation = useMutation({
    mutationFn: updateOrganizerProfile,
  });
  const updateDocumentsMutation = useMutation({
    mutationFn: updateOrganizerDocuments,
  });
  const checkUserMutation = useMutation({ mutationFn: checkUserRequest });

  const isUpdatingAccount = updateAccountMutation.isPending;
  const isUpdatingProfile = updateProfileMutation.isPending;
  const isUpdatingDocuments = updateDocumentsMutation.isPending;

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
    data: organizerProfile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchOrganizerProfile,
  } = useQuery({
    queryKey: ["organizer-profile"],
    queryFn: getOrganizerProfile,
    enabled: Boolean(authToken),
    refetchOnMount: "always",
  });

  // Fetch org type options
  const { data: orgTypeData, isLoading: orgTypeLoading } = useQuery({
    queryKey: ["org-type-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("org_type"),
    enabled: !!selectedLanguage,
  });

  // Fetch sector options
  const { data: sectorData, isLoading: sectorLoading } = useQuery({
    queryKey: ["sector-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("sector"),
    enabled: !!selectedLanguage,
  });

  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ["user-interest-choices", selectedLanguage],
    queryFn: () => getDropdownChoicesRequest("user_interest"),
    enabled: !!selectedLanguage,
  });

  const orgTypeOptions =
    orgTypeData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id.toString(),
      rawValue: item.value_en,
    })) || [];

  const sectorOptions =
    sectorData?.data?.map((item: any) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: item.id.toString(),
    })) || [];

  const tagOptions =
    tagsData?.data?.map((item: any) => ({
      id: item.id,
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
    })) || [];

  useEffect(() => {
    window.scrollTo(0, 0);
    refetchAccountData();
    refetchOrganizerProfile();
  }, [componentKey, refetchAccountData, refetchOrganizerProfile]);

  useEffect(() => {
    if (accountData?.data?.profile_pic) {
      setProfilePic(accountData.data.profile_pic);
    }
  }, [accountData]);

  // Sync keptDocIds when organizer profile loads/reloads
  useEffect(() => {
    if (organizerProfile?.data?.documents) {
      setKeptDocIds(
        organizerProfile.data.documents.map((d: { id: number }) => d.id)
      );
    }
  }, [organizerProfile]);

  const initialValues: CombinedOrganizerFormValues = {
    email: accountData?.data?.email || "",
    phone_number: accountData?.data?.phone_number || "",
    country_code: accountData?.data?.country_code || "",
    password: accountData?.data?.password || " ",
    manual_id: accountData?.data?.manual_id || user?.id || "",
    documents: [],
    company_name: organizerProfile?.data?.company_name || "",
    nickname: organizerProfile?.data?.nickname || "",
    license_number: organizerProfile?.data?.license_number || "",
    sector: organizerProfile?.data?.sector_display?.id?.toString() || "",
    organizer_type:
      organizerProfile?.data?.organizer_type_display?.id?.toString() || "",
    _interests:
      organizerProfile?.data?.interest_display?.map(
        (interest: { id: string }) => interest.id
      ) || [],
    socialMedia:
      organizerProfile?.data?.socialMedia?.length > 0
        ? organizerProfile.data.socialMedia
        : [{ platform: "", link: "" }],
  };

  const validationSchema = Yup.object({
    phone_number: Yup.string().when("country_code", (country_code: any, schema: any) => {
      const code = Array.isArray(country_code) ? country_code[0] : country_code;
      return createPhoneNumberSchema(code);
    }),
    organizer_type: Yup.string().required(t("COMMON.REQUIRED.FIELD")),
    documents: Yup.array().test(
      "fileSizeAndRequired",
      t("COMMON.FILE.TOO.LARGE"),
      function (files) {
        const organizer_type = this.parent?.organizer_type;
        const selected = orgTypeOptions.find(
          (o: any) => String(o.value) === String(organizer_type)
        );
        const isPublic = isLicenseExemptOrgType(selected?.rawValue);

        // When files are provided, always validate size
        if (files && files.length > 0) {
          return files.every(
            (file: any) => file instanceof File && file.size <= 2 * 1024 * 1024
          );
        }

        // No new files provided
        if (isPublic) return true; // never required for Public

        // Non-Public: valid only if the user is still keeping at least one existing doc
        if (keptDocIds.length > 0) return true;

        return this.createError({ message: t("COMMON.REQUIRED.FIELD") });
      }
    ),
    nickname: Yup.string()
      .required(t("COMMON.REQUIRED.FIELD"))
      .max(50, t("COMMON.MUST.BE.ATMOST") + 50 + t("COMMON.CHARACTERS"))
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
    // Optional registration / licence number — digits only, max 100 chars
    license_number: YupDigitsOnlyOptional(100),
    socialMedia: Yup.array().of(
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
            const url = link && link.toLowerCase();
            const invalidUrl = () =>
              this.createError({
                path: `${this.path}.link`,
                message: t("COMMON.INVALID.URL_FORMAT"),
              });

            switch (platform) {
              case "facebook":
                if (url && !url.includes("facebook.com")) return invalidUrl();
                break;
              case "twitter":
                if (
                  url &&
                  !url.includes("twitter.com") &&
                  !url.includes("x.com")
                ) {
                  return invalidUrl();
                }
                break;
              case "whatsapp":
                if (url && !url.includes("whatsapp.com")) return invalidUrl();
                break;
              case "linkedin":
                if (url && !url.includes("linkedin.com")) return invalidUrl();
                break;
              case "instagram":
                if (url && !url.includes("instagram.com")) return invalidUrl();
                break;
              default:
                return true;
            }
            return true;
          }
        )
    ),
  });

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      fileInputRef.current &&
      event.target.files &&
      event.target.files.length > 0
    ) {
      const file = event.target.files[0];

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target && typeof e.target.result === "string") {
            setImageToCrop(e.target.result);
            setShowCropModal(true);
          }
        };
        reader.readAsDataURL(file);
      }

      // Reset the file input
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedImage: File) => {
    try {
      setIsProfilePicUpdating(true);
      setIsOnlyProfilePicChanged(true);
      const formData = new FormData();
      formData.append("profile_pic", croppedImage);

      const response = await updateAccountMutation.mutateAsync(formData);
      setUploadError(null);
      setComponentKey((prev) => prev + 1);

      // The API overwrites the picture at the same URL, so the saved one only
      // shows up after a refresh unless the URL is cache-busted.
      const imageUrl = URL.createObjectURL(croppedImage);
      setProfilePic(imageUrl);
      updateProfilePic(
        response?.data?.profile_pic
          ? withCacheBust(response.data.profile_pic)
          : imageUrl
      );

      // Close the crop modal
      setShowCropModal(false);
      setImageToCrop("");

      toast.success(t("COMMON.TOAST.PROFILE_PIC_UPDATE_SUCCESSFULLY"));

      router.push("/entities-profile");
    } catch {
      setUploadError(t("COMMON.TOAST.PROFILE_PIC_UPDATE_FAILED"));
    } finally {
      setIsProfilePicUpdating(false);
    }
  };

  const handleCropCancel = () => {
    // Close the modal and reset image — nothing is saved on cancel
    setShowCropModal(false);
    setImageToCrop("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    values: CombinedOrganizerFormValues,
    { resetForm }: FormikHelpers<CombinedOrganizerFormValues>
  ) => {
    try {
      let hasAccountChanges = false;
      const accountFormData = new FormData();

      // Account info changes
      if (values.phone_number !== accountData?.data?.phone_number) {
        accountFormData.append("phone_number", values.phone_number);
        hasAccountChanges = true;
      }

      if (values.country_code !== accountData?.data?.country_code) {
        accountFormData.append("country_code", values.country_code);
        hasAccountChanges = true;
      }

      // Organizer profile changes
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
        company_name: values.company_name,
        nickname: values.nickname,
        sector: values.sector,
        organizer_type: values.organizer_type,
        _interests: values._interests,
        license_number: values.license_number,
        ...socialMediaFields,
      };

      const hasProfileChanges = Object.keys(profileData).some((key) => {
        if (key === "organizer_type") {
          return (
            String(profileData.organizer_type ?? "") !==
            String(organizerProfile?.data?.organizer_type_display?.id ?? "")
          );
        }
        return (
          JSON.stringify(profileData[key]) !==
          JSON.stringify(organizerProfile?.data?.[key] ?? "")
        );
      });

      const hasNewDocuments = values.documents && values.documents.length > 0;

      const originalDocIds: number[] =
        organizerProfile?.data?.documents?.map((d: { id: number }) => d.id) ??
        [];
      const hasExistingDocRemoved = keptDocIds.length < originalDocIds.length;

      // Submit changes
      if (hasAccountChanges) {
        await updateAccountMutation.mutateAsync(accountFormData);
      }

      if (hasProfileChanges) {
        await updateProfileMutation.mutateAsync(profileData);
      }

      if (hasNewDocuments || hasExistingDocRemoved) {
        const docsFormData = new FormData();
        keptDocIds.forEach((id) =>
          docsFormData.append("existing_ids", String(id))
        );
        for (const doc of values.documents) {
          docsFormData.append("new_documents", doc);
        }
        await updateDocumentsMutation.mutateAsync(docsFormData);
      }

      if (
        hasAccountChanges ||
        hasProfileChanges ||
        hasNewDocuments ||
        hasExistingDocRemoved
      ) {
        toast.success(t("COMMON.TOAST.PROFILE_UPDATED_SUCCESSFULLY"));
        setComponentKey((prev) => prev + 1);
        resetForm();
        setIsOnlyProfilePicChanged(false);
        router.push("/entities-profile");
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
  if (isAccountLoading || isProfileLoading || sectorLoading || orgTypeLoading) {
    return <Loader />;
  }
  if (accountError || profileError) {
    return (
      <div>
        {t("COMMON.ERROR")}: {String(accountError || profileError)}
      </div>
    );
  }

  const originalDocCount = organizerProfile?.data?.documents?.length ?? 0;

  return (
    <>
      {/* Render crop modal outside of the main component flow */}
      {showCropModal && imageToCrop && (
        <ProfilePictureCropModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      <div className="border-t border-[#000]">
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
              errors,
              isValid,
              touched,
              dirty,
              resetForm,
            }) => {
              const isSocialMediaTouched =
                Array.isArray(touched.socialMedia) &&
                touched.socialMedia.some(
                  (field) => field?.platform || field?.link
                );

              return (
                <div className="flex justify-center">
                  <div className="w-[90%] 2xl:w-[1200px] lg:w-[1000px] md:w-[90%] 2xl:pt-12 lg:pt-5 pt-5 relative">
                    <Form className="relative">
                      {(isUpdatingAccount ||
                        isUpdatingProfile ||
                        isUpdatingDocuments) &&
                        !isProfilePicUpdating && (
                          <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75 z-10">
                            <Loader />
                          </div>
                        )}

                      {/* Account Information Section */}
                      <div>
                        <div className="relative w-[168px] h-[168px] mx-auto">
                          <Image
                            src={profilePic || asset("profile/org_profile.svg")}
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
                              ref={fileInputRef}
                              onChange={handleFileSelection}
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
                          <Input
                            name="company_name"
                            type="text"
                            className="text-center text-primary-5 font-bold text-[25px] border-none focus:ring-0 bg-transparent p-0"
                            placeholder={t("COMMON.ENTER.FULL.NAME")}
                          />
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
                                  countryCode={values.country_code}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex mobilescreen:gap-0 mobilescreen:flex-col gap-4">
                          <div className="relative flex-1">
                            <Input
                              name="license_number"
                              digitsOnly
                              inputMode="numeric"
                              maxLength={100}
                              type="text"
                              label={t("COMMON.ENTER_LICENSE_NUMBER")}
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
                                    accountData?.data?.manual_id ||
                                      user?.id ||
                                      ""
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

                      {/* Organizer Personal Details Section */}
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
                            label={t("COMMON.NICKNAME")}
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
                        <div className="w-full selectfiled">
                          <SelectInput
                            name="sector"
                            label={t("COMMON.SECTOR")}
                            options={sectorOptions}
                            onChange={(selectedOption) =>
                              setFieldValue("sector", selectedOption?.value || "")
                            }
                          />
                        </div>
                      </div>

                      {/* Entity Type */}
                      <div className="selectfiled">
                        <SelectInput
                          name="organizer_type"
                          label={t("COMMON.ORGANIZER.TYPE")}
                          options={orgTypeOptions}
                          onChange={(selectedOption) =>
                            setFieldValue(
                              "organizer_type",
                              String(selectedOption?.value ?? "")
                            )
                          }
                          disabled={orgTypeLoading}
                        />
                      </div>

                      {/* Upload License */}
                      <div className="mb-4">
                        <UploadInput
                          name="documents"
                          label={t("COMMON.UPLOAD_CERTIFICATE")}
                          existingFiles={(
                            organizerProfile?.data?.documents ?? []
                          )
                            .filter((doc: { id: number }) =>
                              keptDocIds.includes(doc.id)
                            )
                            .map(
                              (
                                doc: { id: number; document: string },
                                index: number
                              ) => ({
                                id: doc.id,
                                name: `Certificate ${index + 1}`,
                                url: doc.document,
                              })
                            )}
                          onRemoveExisting={(id) =>
                            setKeptDocIds((prev) =>
                              prev.filter((kid) => kid !== id)
                            )
                          }
                          onChange={(event) => {
                            const files = event.currentTarget.files
                              ? Array.from(event.currentTarget.files)
                              : [];
                            setFieldValue("documents", files);
                          }}
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

                      {/* Social Media Fields */}
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

                                  {index === values.socialMedia.length - 1 &&
                                  values.socialMedia.length <
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

                      {/* Submit and Cancel Buttons */}
                      <div className="flex justify-center gap-[28px] 2xl:pt-8 lg:pt-3 pt-3 mt-8">
                        <Button
                          variant="primary"
                          size="medium"
                          type="submit"
                          disabled={
                            isUpdatingAccount ||
                            isUpdatingProfile ||
                            isUpdatingDocuments ||
                            !isValid ||
                            (!dirty && keptDocIds.length === originalDocCount) ||
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
                            setKeptDocIds(
                              organizerProfile?.data?.documents?.map(
                                (d: { id: number }) => d.id
                              ) ?? []
                            );
                          }}
                          disabled={
                            !dirty &&
                            !isOnlyProfilePicChanged &&
                            keptDocIds.length === originalDocCount
                          }
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
    </>
  );
}
