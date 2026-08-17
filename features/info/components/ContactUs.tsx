"use client";

import { Button } from "@/components/ui/Button";
import { useTranslation } from "react-i18next";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import Title from "@/components/shared/Title";
import ModalInput from "./ModalInput";
import ModalTextarea from "./ModalTextarea";
import { useMutation } from "@tanstack/react-query";
import { createContactUs } from "@/features/services/api";
import { useState } from "react";
import { YupEmail, YupRequiredString } from "@/lib/schema";
import { toast } from "sonner";
import { useHomeCms } from "@/features/cms/hooks/useHomeCms";
import { pickLocalized, type FooterContact } from "@/lib/api/cms";
import { getApiErrorMessage } from "@/lib/api/errors";

/** No bundled WhatsApp asset — the icon set is inline SVG elsewhere too. */
function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 448 512"
      fill="currentColor"
    >
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 110.9L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
  );
}

interface ContactUsProps {
  /**
   * Admin-editable contact details (`GET /home/` → `footer.contact`). Passed in
   * by the route so they are server-rendered; omitted, they are fetched from
   * the shared React Query cache instead.
   */
  initialContact?: FooterContact | null;
}

export default function ContactUs({ initialContact }: ContactUsProps) {
  const { t, i18n } = useTranslation();
  const { cms } = useHomeCms({ enabled: initialContact === undefined });
  const contact = initialContact ?? cms?.footer?.contact ?? null;
  const contactUsMutation = useMutation({
    mutationFn: createContactUs,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const language = i18n.language;
  const address = pickLocalized(
    contact?.address_en,
    contact?.address_ar,
    language
  );
  const introText = pickLocalized(
    contact?.page_text_en,
    contact?.page_text_ar,
    language
  );
  // The dashboard accepts either a bare number or a full wa.me/chat URL.
  const whatsappHref = contact?.whatsapp
    ? /^https?:\/\//i.test(contact.whatsapp)
      ? contact.whatsapp
      : `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`
    : "";

  const initialValues = {
    name: "",
    email: "",
    message: "",
  };

  const validationSchema = Yup.object({
    name: Yup.string().concat(YupRequiredString),
    email: YupEmail,
    message: Yup.string().concat(YupRequiredString),
  });

  const handleSubmit = async (
    values: typeof initialValues,
    { resetForm }: { resetForm: () => void }
  ) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    const currentLanguage = i18n.language;
    const payload: Record<string, string> = {
      email: values.email,
      primary_language: currentLanguage,
    };

    if (currentLanguage === "ar") {
      payload.name_ar = values.name;
      payload.message_ar = values.message;
    } else {
      payload.name_en = values.name;
      payload.message_en = values.message;
    }

    try {
      const response = await contactUsMutation.mutateAsync(payload);
      resetForm();
      // The backend localizes `msg` from the language header — prefer it.
      toast.success(response?.msg || t("COMMON.TOAST.CONTACT_US_SUCCESS"));
    } catch (error) {
      console.error("Contact form submission failed:", error);
      toast.error(
        getApiErrorMessage(
          error,
          currentLanguage,
          t("COMMON.TOAST.CONTACT_US_FAILED")
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px]">
        <h1 className="flex text-start justify-start 2xl:px-5 px-3 mobilescreen:px-[13px]">
          <Title text={t("COMMON.CONTACTUS")} variant="default" />
        </h1>
        <div className="flex justify-center">
          <div className="bg-contacts bg-[linear-gradient(to_right,_#f3f3f3_50%,_#29246d_50%)] rtl:bg-[linear-gradient(to_left,_#f3f3f3_50%,_#29246d_50%)] items-center flex flex-col mobilescreen:flex-col md:flex-row rounded-[30px] overflow-hidden 2xl:w-[1170px] laptopmain:w-[1300px] lg:w-[90%] w-[100%]">
            {/* Contact Form */}
            <div className="w-full md:w-1/2 2xl:py-14 lg:py-8 md:py-8 py-10 px-6 contactinput bgcl1">
              <h2 className="lg:text-[40px] md:text-4xl text-2xl font-bold text-[#29246d] mb-6">
                {t("COMMON.GET_IN_TOUCH")}
              </h2>

              {/* Intro copy — admin-editable */}
              {introText && (
                <p className="text-secondary-100 text-base mb-6 whitespace-pre-line">
                  {introText}
                </p>
              )}

              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {() => (
                  <Form className="">
                    <div className="pb-1 mobilescreen:pb-0">
                      <ModalInput
                        name="name"
                        placeholder={t("COMMON.NAME")}
                        type="text"
                      />
                    </div>

                    <div className="pb-1 mobilescreen:pb-0">
                      <ModalInput
                        name="email"
                        placeholder={t("COMMON.EMAIL")}
                        type="email"
                      />
                    </div>

                    <div className="pb-14 mobilescreen:pb-10">
                      <ModalTextarea
                        placeholder={t("COMMON.MESSAGE")}
                        name="message"
                      />
                    </div>

                    <div className="flex justify-center">
                      <Button
                        type="submit"
                        variant="primary"
                        size="medium"
                        className=""
                        disabled={isSubmitting || contactUsMutation.isPending}
                      >
                        {t("COMMON.SEND")}
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>

            {/* Map and Contact Info */}
            <div className="w-full md:w-1/2 text-white p-8 bgcl2">
              <a
                href="https://maps.app.goo.gl/8PEoN6SfL2Xq17p1A"
                target="_blank"
                rel="noopener noreferrer"
                className="block h-64 bg-gray-200 rounded-lg mb-8 overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                title="View location on Google Maps"
              >
                <img
                  src="/assets/homepage/mapimg.png"
                  alt="Map location"
                  className="w-full h-full object-cover cursor-pointer"
                />
              </a>

              {/* Contact details — admin-editable (`GET /home/` → footer.contact) */}
              <div className="space-y-4">
                {address && (
                  <a
                    href="https://maps.app.goo.gl/8PEoN6SfL2Xq17p1A"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-[17px] hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    title="View location on Google Maps"
                  >
                    <img src="/assets/homepage/mapicn.svg" alt="" aria-hidden="true" />
                    <span>{address}</span>
                  </a>
                )}

                {contact?.phone && (
                  <div className="flex items-center gap-[17px]">
                    <img src="/assets/homepage/phoneicn.svg" alt="" aria-hidden="true" />
                    <a
                      href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                      className="not-italic no-underline text-inherit cursor-pointer hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}

                {contact?.whatsapp && (
                  <div className="flex items-center gap-[17px]">
                    <WhatsAppIcon />
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="not-italic no-underline text-inherit cursor-pointer hover:underline"
                    >
                      {contact.whatsapp}
                    </a>
                  </div>
                )}

                {contact?.email && (
                  <div className="flex items-center gap-[17px]">
                    <img src="/assets/homepage/mailicn.svg" alt="" aria-hidden="true" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="not-italic no-underline text-inherit cursor-pointer hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
