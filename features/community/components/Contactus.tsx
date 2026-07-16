"use client";

import { Formik, Form, FormikHelpers } from "formik";
import ModalTextarea from "@/components/ui/ModalTextarea";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { communityPostContactUs } from "@/features/services/api";
import { useEffect } from "react";
import * as Yup from "yup";
import { YupRequiredString, YupStringMaxLength } from "@/lib/schema";
import { toast } from "sonner";

interface FormValues {
  message: string;
}

interface ContactUsProps {
  postId: string;
  onLoadingChange: (isLoading: boolean) => void;
  afterReplyCreation: () => void;
}

function Contactus({ postId, onLoadingChange, afterReplyCreation }: ContactUsProps) {
  const { t } = useTranslation();

  const contactUsMutation = useMutation({
    mutationFn: communityPostContactUs,
  });

  useEffect(() => {
    onLoadingChange?.(contactUsMutation.isPending);
  }, [contactUsMutation.isPending, onLoadingChange]);

  const initialValues: FormValues = {
    message: "",
  };

  const validationSchema = Yup.object({
    message: YupStringMaxLength(300).concat(YupRequiredString),
  });

  const handleSubmit = async (
    values: FormValues,
    { resetForm }: FormikHelpers<FormValues>
  ) => {
    try {
      await contactUsMutation.mutateAsync({
        message: values.message,
        post_id: postId,
      });

      toast.success(t("COMMON.TOAST.CONTACT_US_SUCCESS"));
      resetForm();
      afterReplyCreation();
    } catch (err) {
      console.error("Contact us failed:", err);
      toast.error(t("COMMON.TOAST.CONTACT_US_FAILED"));
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {() => (
        <div className="md:w-[100%] rounded-lg bg-white pb-[20px] filtermodal">
          <Form>
            <div>
              <ModalTextarea
                placeholder={t("COMMON.SHARE_YOUR_MESSAGE")}
                name="message"
              />
            </div>
          </Form>
        </div>
      )}
    </Formik>
  );
}

export default Contactus;
