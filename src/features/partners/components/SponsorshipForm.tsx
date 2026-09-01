"use client";

import { Formik, Form, FormikHelpers, FormikProps } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import PhoneInput from "@/components/ui/PhoneInput";
import Title from "@/components/shared/Title";
import { Button } from "@/components/ui/Button";
import { HomepageBannerClient } from "@/features/home";
import TextArea from "@/components/ui/TextArea";
import UploadDocument from "@/components/ui/UploadDocument";
import { YupEmail, YupFileSize, YupPhoneNumber, YupRequiredString, YupStringMaxLength, createPhoneNumberSchema } from "@/features/shared/schemas";
import SelectInput from "@/components/ui/SelectInput";
import { useLanguageStore } from "@/store/languageStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createSponsors } from "@/features/partners/services/partnersApi";
import { getDropdownChoices } from "@/features/shared/services/dropdowns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const CountryCodeSelect = dynamic(
  () => import("@/components/ui/CountryCodeSelect"),
  { ssr: false, loading: () => <div className="h-[48px] rounded-2xl bg-gray-100 animate-pulse mb-4" /> }
);
import { useMemo, useEffect } from "react";

interface ChoiceItem {
  id: number;
  value_en: string;
  value_ar: string;
}


interface SponsorshipFormValues {
  org_name: string;
  org_type: string;
  person_name: string;
  email: string;
  phone_number: string;
  country_code: string;
  sponsor_type: string;
  type_of_support: string;
  sponsorship_details: string;
  new_sponsor_documents: File[];
  sponsor_logo: File | null;
}

export default function SponsorshipForm() {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const router = useRouter();

  const sponsorsMutation = useMutation({
    mutationFn: createSponsors,
  });

  const { data: orgTypeData, isLoading: orgTypeLoading } = useQuery({
    queryKey: ["dropdownChoices", "org_type"],
    queryFn: () => getDropdownChoices("org_type"),
    enabled: !!selectedLanguage,
  });

  const { data: sponsorTypeData, isLoading: sponsorTypeLoading } = useQuery({
    queryKey: ["dropdownChoices", "sponsor_type"],
    queryFn: () => getDropdownChoices("sponsor_type"),
    enabled: !!selectedLanguage,
  });

  const { data: supportTypeData, isLoading: supportTypeLoading } = useQuery({
    queryKey: ["dropdownChoices", "type_of_support"],
    queryFn: () => getDropdownChoices("type_of_support"),
    enabled: !!selectedLanguage,
  });

  const orgTypeOptions =
    orgTypeData?.data?.map((item: ChoiceItem) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: String(item.id),
    })) || [];

  const sponsorTypeOptions =
    sponsorTypeData?.data?.map((item: ChoiceItem) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: String(item.id),
      key: item.id,
      value_en: item.value_en,
      value_ar: item.value_ar,
    })) || [];

  const allSupportTypeOptions =
    supportTypeData?.data?.map((item: ChoiceItem) => ({
      label: selectedLanguage === "ar" ? item.value_ar : item.value_en,
      value: String(item.id),
      key: item.id,
      value_en: item.value_en,
      value_ar: item.value_ar,
    })) || [];

  const initialValues: SponsorshipFormValues = {
    org_name: "",
    org_type: "",
    person_name: "",
    email: "",
    phone_number: "",
    country_code: "",
    sponsor_type: "",
    type_of_support: "",
    sponsorship_details: "",
    new_sponsor_documents: [],
    sponsor_logo: null,
  };

  const validationSchema = Yup.object({
    org_name: YupStringMaxLength(100).concat(YupRequiredString),
    org_type: Yup.string().concat(YupRequiredString),
    person_name: YupStringMaxLength(100).concat(YupRequiredString),
    email: YupEmail,
    phone_number: Yup.string().when("country_code", (country_code: any, schema: any) => {
      const code = Array.isArray(country_code) ? country_code[0] : country_code;
      return createPhoneNumberSchema(code);
    }),
    country_code: Yup.string().concat(YupRequiredString),
    sponsor_type: YupRequiredString,
    type_of_support: YupRequiredString,
    sponsorship_details: YupRequiredString,
    new_sponsor_documents: YupFileSize,
    sponsor_logo: Yup.mixed()
      .required(() => t("COMMON.REQUIRED.FIELD"))
      .test(
        "is-null",
        () => t("COMMON.REQUIRED.FIELD"),
        (value) => value !== null
      )
      .test("file-size-not-zero", () => t("COMMON.REQUIRED.FIELD"), (value) => {
        if (value instanceof File) {
          return value.size > 0;
        }
        return value !== undefined && value !== "";
      }),
  });

  const handleSubmit = async (
    values: SponsorshipFormValues,
    { resetForm }: FormikHelpers<SponsorshipFormValues>
  ) => {
    try {
      const formData = new FormData();
      formData.append("org_name", values.org_name);
      formData.append("_org_type_id", values.org_type);
      formData.append("person_name", values.person_name);
      formData.append("email", values.email);
      formData.append("phone_number", values.phone_number);
      formData.append("country_code", values.country_code);
      formData.append("_sponsor_type_id", values.sponsor_type);
      formData.append("_type_of_support_id", values.type_of_support);
      formData.append("sponsorship_details", values.sponsorship_details);
      formData.append("preferred_language", selectedLanguage);

      values.new_sponsor_documents.forEach((file, index) => {
        formData.append(`new_sponsor_documents[${index}]`, file);
      });

      if (values.sponsor_logo) {
        formData.append("sponsor_logo", values.sponsor_logo);
      }

      await sponsorsMutation.mutateAsync(formData);
      toast.success(t("COMMON.TOAST.SPONSORSHIP_APPLICATION_SUCCESS"));
      resetForm();
      router.push("/thankyou");
    } catch (err) {
      console.error("Registration failed:", err);
      toast.error(t("COMMON.TOAST.SPONSORSHIP_APPLICATION_FAILED"));
    }
  };

  return (
    <>
      <HomepageBannerClient />
      <div className="2xl:w-[70%] lg:w-[80%] w-[90%] 2xl:pb-[70px] laptopmain:pb-[50px] laptop:pb-[40px] lg:pb-[40px] pb-[40px] mx-auto">
        <h2 className="">
          <Title
            text={t("COMMON.SPONSORSHIP_APPLICATION_FORM")}
            variant="default"
          />
        </h2>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formikProps) => (
            <SponsorshipFormInner
              formikProps={formikProps}
              sponsorTypeOptions={sponsorTypeOptions}
              orgTypeOptions={orgTypeOptions}
              allSupportTypeOptions={allSupportTypeOptions}
              orgTypeLoading={orgTypeLoading}
              sponsorTypeLoading={sponsorTypeLoading}
              supportTypeLoading={supportTypeLoading}
              sponsorsMutation={sponsorsMutation}
            />
          )}
        </Formik>
      </div>
    </>
  );
}

interface SponsorshipFormInnerProps {
  formikProps: FormikProps<SponsorshipFormValues>;
  sponsorTypeOptions: { value: string; label: string; value_en?: string; value_ar?: string }[];
  orgTypeOptions: { value: string; label: string }[];
  allSupportTypeOptions: { value: string; label: string; value_en?: string; value_ar?: string }[];
  orgTypeLoading: boolean;
  sponsorTypeLoading: boolean;
  supportTypeLoading: boolean;
  sponsorsMutation: any;
}

function SponsorshipFormInner({
  formikProps,
  sponsorTypeOptions,
  orgTypeOptions,
  allSupportTypeOptions,
  orgTypeLoading,
  sponsorTypeLoading,
  supportTypeLoading,
  sponsorsMutation,
}: SponsorshipFormInnerProps) {
  const { setFieldValue, values, isValid } = formikProps;
  const { t } = useTranslation();

  const selectedSponsorType = sponsorTypeOptions.find(
    (option: { value: string; value_en?: string; value_ar?: string }) => option.value === values.sponsor_type
  );

  const selectedSponsorLabelEn =
    selectedSponsorType?.value_en?.toLowerCase() || "";
  const selectedSponsorLabelAr =
    selectedSponsorType?.value_ar?.toLowerCase() || "";

  const isFinancialSponsorType =
    selectedSponsorLabelEn === "financial sponsor" ||
    selectedSponsorLabelAr === "رعاية مالية";

  const isInKindSponsorType =
    selectedSponsorLabelEn === "supporting partner" ||
    selectedSponsorLabelAr === "شريك داعم";

  const isMediaSponsorType =
    selectedSponsorLabelEn === "media sponsor" ||
    selectedSponsorLabelAr === "رعاية إعلامية";

  const filteredSupportTypeOptions = useMemo(() => {
    if (!values.sponsor_type || !allSupportTypeOptions.length) {
      return [];
    }

    if (isFinancialSponsorType) {
      return allSupportTypeOptions.filter((option: { value: string; value_en?: string; value_ar?: string }) => {
        const label_en = option.value_en?.toLowerCase() || "";
        const label_ar = option.value_ar?.toLowerCase() || "";

        return (
          label_en.includes("gold") ||
          label_en.includes("silver") ||
          label_en.includes("bronze") ||
          label_ar.includes("ذهبي") ||
          label_ar.includes("فضي") ||
          label_ar.includes("برونزي")
        );
      });
    } else if (isInKindSponsorType) {
      return allSupportTypeOptions.filter((option: { value: string; value_en?: string; value_ar?: string }) => {
        const label_en = option.value_en?.toLowerCase() || "";
        const label_ar = option.value_ar?.toLowerCase() || "";

        return (
          label_en.includes("equipment") ||
          label_en.includes("logistical") ||
          label_en.includes("incentive") ||
          label_en.includes("services") ||
          label_en.includes("other") ||
          label_ar.includes("معدات وأدوات") ||
          label_ar.includes("لوجستي") ||
          label_ar.includes("هدية تحفيزية") ||
          label_ar.includes("خدمات") ||
          label_ar.includes("آخر")
        );
      });
    } else if (isMediaSponsorType) {
      return allSupportTypeOptions.filter((option: { value: string; value_en?: string; value_ar?: string }) => {
        const label_en = option.value_en?.toLowerCase() || "";
        const label_ar = option.value_ar?.toLowerCase() || "";

        return label_en === "media" || label_ar === "إعلامي";
      });
    }

    return allSupportTypeOptions;
  }, [
    values.sponsor_type,
    allSupportTypeOptions,
    isFinancialSponsorType,
    isInKindSponsorType,
    isMediaSponsorType,
  ]);

  useEffect(() => {
    setFieldValue("type_of_support", "");
  }, [values.sponsor_type, setFieldValue]);

  return (
    <Form className="selectfiled">
      <div className="flex gap-6 mobilescreen:gap-1 mobilescreen:flex-col">
        <Input
          name="org_name"
          label={t("COMMON.ORGANIZATION_NAME")}
          type="text"
        />
        <SelectInput
          name="org_type"
          label={t("COMMON.TYPE_OF_ORGANIZATION")}
          options={orgTypeOptions}
          onChange={(selectedOption) =>
            setFieldValue("org_type", selectedOption?.value || "")
          }
          disabled={orgTypeLoading}
        />
      </div>
      <div className="flex gap-6 mobilescreen:gap-1 mobilescreen:flex-col">
        <Input
          name="person_name"
          label={t("COMMON.CONTACT_PERSON_NAME")}
          type="text"
        />
        <Input
          name="email"
          label={t("COMMON.EMAIL_ADDRESS")}
          type="email"
        />
      </div>

      <div className="flex gap-6 mobilescreen:gap-1 laptopitm1:flex-col laptopitm1:gap-0 lg:flex-row mobilescreen:flex-col lg:gap-6 md:flex-col md:gap-0">
        <div className="lg:w-1/2 md:w-full mobilescreen:w-full laptopitm1:w-full">
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
        <div className="w-1/2 xss:flex-col flex gap-1 mobilescreen:w-full md:w-full lg:w-1/2 laptopitm1:w-full">
          <div className="w-1/2 xss:w-full">
            <div className="max-w-[95%] xss:max-w-full">
              <SelectInput
                name="sponsor_type"
                label={t("COMMON.SPONSORSHIP_TYPE")}
                options={sponsorTypeOptions}
                onChange={(selectedOption) => {
                  setFieldValue("sponsor_type", selectedOption?.value || "");
                }}
                disabled={sponsorTypeLoading}
              />
            </div>
          </div>
          <div className="w-1/2 xss:w-full">
            <div className="max-w-[100%]">
              <SelectInput
                name="type_of_support"
                label={t("COMMON.TYPE_OF_SUPPORT_PROVIDED")}
                options={filteredSupportTypeOptions}
                onChange={(selectedOption) =>
                  setFieldValue(
                    "type_of_support",
                    selectedOption?.value || ""
                  )
                }
                disabled={
                  supportTypeLoading ||
                  !values.sponsor_type ||
                  filteredSupportTypeOptions.length === 0
                }
              />
            </div>
          </div>
        </div>
      </div>

      <TextArea
        name="sponsorship_details"
        label={t("COMMON.SPONSORSHIP_DETAILS")}
        rows={5}
      />

      <div className="pb-4">
        <UploadDocument
          name="new_sponsor_documents"
          label={t("COMMON.UPLOAD_DOCUMENTS")}
          instructions={[
            t("COMMON.OFFICIAL_SPONSORSHIP_LETTER"),
            t("COMMON.COMMERCIAL_REGISTRATION_COPY"),
          ]}
          multiple={true}
          setFieldValue={setFieldValue}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            event.preventDefault();
            const newFiles = event.target.files
              ? Array.from(event.target.files)
              : [];
            const updatedFiles = [
              ...(values.new_sponsor_documents || []),
              ...newFiles,
            ];
            setFieldValue("new_sponsor_documents", updatedFiles);
          }}
        />
      </div>
      <div>
        <UploadDocument
          name="sponsor_logo"
          label={t("COMMON.UPLOAD_LOGO")}
          instructions={[t("COMMON.HIGH_QUALITY_LOGO")]}
          multiple={false}
          accept="image/jpeg, image/png"
          setFieldValue={setFieldValue}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            event.preventDefault();
            const file = event.target.files
              ? event.target.files[0]
              : null;
            setFieldValue("sponsor_logo", file);
          }}
        />
      </div>
      <div className="flex justify-center 2xl:pt-[70px] laptopmain:2xl:pt-[40px] laptop:pt-[40px] pt-[40px]">
        <Button
          type="submit"
          variant="primary"
          size="medium"
          disabled={!isValid || sponsorsMutation.isPending}
        >
          {t("COMMON.SUBMIT")}
        </Button>
      </div>
    </Form>
  );
}

