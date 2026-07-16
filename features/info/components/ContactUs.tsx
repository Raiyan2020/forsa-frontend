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

export default function ContactUs() {
  const { t, i18n } = useTranslation();
  const contactUsMutation = useMutation({
    mutationFn: createContactUs,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    { resetForm }: any
  ) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    const currentLanguage = i18n.language;
    let payload: any = {
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
      await contactUsMutation.mutateAsync(payload);
      resetForm();
      toast.success(t("COMMON.TOAST.CONTACT_US_SUCCESS"));
    } catch (error) {
      console.error("Contact form submission failed:", error);
      toast.error(t("COMMON.TOAST.CONTACT_US_FAILED"));
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

              <div className="space-y-4">
                <a
                  href="https://maps.app.goo.gl/8PEoN6SfL2Xq17p1A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-[17px] hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="View location on Google Maps"
                >
                  <img src="/assets/homepage/mapicn.svg" alt="Location icon" />
                  <span className="">
                    Mezzanine Floor, Al Tujjar Tower
                  </span>
                </a>

                <div className="flex items-center gap-[17px]">
                  <img src="/assets/homepage/phoneicn.svg" alt="Phone icon" />
                  <a
                    href="tel:41447176"
                    className="not-italic no-underline text-inherit cursor-pointer hover:underline"
                  >
                    41447176
                  </a>
                </div>

                <div className="flex items-center gap-[17px]">
                  <img src="/assets/homepage/mailicn.svg" alt="Email icon" />
                  <a
                    href="mailto:forsa@joinforsa.net"
                    className="not-italic no-underline text-inherit cursor-pointer hover:underline"
                  >
                    forsa@joinforsa.net
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
