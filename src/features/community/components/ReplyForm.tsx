"use client";

import { Formik, Form, FormikHelpers } from "formik";
import { useTranslation } from "react-i18next";
import ModalTextarea from "@/components/ui/ModalTextarea";
import UploadDocument from "@/components/ui/UploadDocument";
import { useLanguageStore } from "@/store/languageStore";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createCommunityReply, updateReply, getReplyById } from "@/features/community/services/communityApi";
import { useEffect, useState } from "react";
import * as Yup from "yup";
import { YupRequiredString, YupStringMaxLength } from "@/lib/schema";
import { toast } from "sonner";
import Loader from "@/components/ui/Loader";

interface ReplyFormValues {
  text: string;
  images: File[];
  [key: string]: any;
}

interface ReplyFormProps {
  postId: string;
  onLoadingChange: (isLoading: boolean) => void;
  afterReplyCreation: () => void;
  replyId?: string;
  refetch?: () => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
  validateFormRef?: React.RefObject<(() => Promise<boolean>) | null>;
}

function ReplyForm({
  postId,
  onLoadingChange,
  afterReplyCreation,
  replyId,
  refetch,
  validateFormRef,
  formRef,
}: ReplyFormProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  // Mutations
  const createReplyMutation = useMutation({
    mutationFn: createCommunityReply,
  });

  const updateReplyMutation = useMutation({
    mutationFn: updateReply,
  });

  const [modifiedReplyImages, setModifiedReplyImages] = useState<
    Array<{ id: number; image: string }>
  >([]);
  const [existingImageIds, setExistingImageIds] = useState<number[]>([]);

  // Get details query
  const { data: apiResponse, isLoading: getDetailsLoading } = useQuery({
    queryKey: ["replyDetails", replyId],
    queryFn: () => getReplyById(replyId!),
    enabled: !!replyId,
  });

  const replyData = Array.isArray(apiResponse?.data)
    ? apiResponse?.data[0]
    : apiResponse?.data;

  useEffect(() => {
    onLoadingChange?.(
      createReplyMutation.isPending ||
        updateReplyMutation.isPending ||
        getDetailsLoading
    );
  }, [
    createReplyMutation.isPending,
    updateReplyMutation.isPending,
    getDetailsLoading,
    onLoadingChange,
  ]);

  useEffect(() => {
    if (replyData) {
      const replyImages =
        replyData.reply_images?.map((img: any) => ({
          id: img.id,
          image: img.image,
        })) || [];

      setModifiedReplyImages(replyImages);
      setExistingImageIds(
        replyData.reply_images?.map((img: any) => img.id) || []
      );
    }
  }, [replyData]);

  const initialValues: ReplyFormValues = {
    text: replyData?.[`text_${selectedLanguage}`] || "",
    images: [],
  };

  const validationSchema = Yup.object({
    text: YupStringMaxLength(280).concat(YupRequiredString),
  });

  const handleSubmit = async (
    values: ReplyFormValues,
    { resetForm }: FormikHelpers<ReplyFormValues>
  ) => {
    try {
      const formData = new FormData();
      formData.append(`text_${selectedLanguage}`, values.text);
      formData.append("primary_language", selectedLanguage);

      if (!replyId) {
        formData.append("post", postId);
      }

      if (replyId) {
        if (existingImageIds.length > 0) {
          existingImageIds.forEach((imgId) => {
            formData.append("existing_image_ids", imgId.toString());
          });
        }
      }

      values.images.forEach((file) => {
        if (file instanceof File) {
          formData.append(`images`, file);
        }
      });

      if (replyId) {
        await updateReplyMutation.mutateAsync({ id: replyId, formData });
      } else {
        await createReplyMutation.mutateAsync(formData);
      }

      toast.success(
        replyId
          ? t("COMMON.TOAST.REPLY_UPDATE_SUCCESS")
          : t("COMMON.TOAST.COMMUNITY_POST_REPLY_SUCCESS")
      );

      afterReplyCreation();
      resetForm();
      refetch?.();
    } catch (err: any) {
      console.error("Reply operation failed:", err);
      
      const errorData = err?.response?.data || err?.data;
      if (errorData && typeof errorData === "object") {
        let errorDisplayed = false;
        Object.keys(errorData).forEach((key) => {
          const errorValue = errorData[key];
          if (
            errorValue &&
            typeof errorValue === "object" &&
            (errorValue.en || errorValue.ar)
          ) {
            const errorMessage =
              errorValue[selectedLanguage] || errorValue.en || errorValue.ar;
            if (errorMessage) {
              toast.error(errorMessage);
              errorDisplayed = true;
            }
          }
        });

        if (!errorDisplayed) {
          toast.error(
            replyId
              ? t("COMMON.TOAST.REPLY_UPDATE_FAILED")
              : t("COMMON.TOAST.COMMUNITY_POST_REPLY_FAILED")
          );
        }
      } else {
        toast.error(
          replyId
            ? t("COMMON.TOAST.REPLY_UPDATE_FAILED")
            : t("COMMON.TOAST.COMMUNITY_POST_REPLY_FAILED")
        );
      }
    }
  };

  const handleRemoveExistingFile = (
    index: number,
    isExistingFile: boolean,
    fieldName: string,
    setFieldValue: (field: string, value: any) => void,
    values: ReplyFormValues
  ) => {
    if (isExistingFile) {
      const removedImageId = modifiedReplyImages[index].id;
      setModifiedReplyImages((prev) => prev.filter((_, i) => i !== index));
      setExistingImageIds((prev) => prev.filter((imgId) => imgId !== removedImageId));

      const currentFiles = Array.isArray(values[fieldName])
        ? values[fieldName]
        : [];
      setFieldValue(
        fieldName,
        currentFiles.filter((file: any) => file instanceof File)
      );
    }
  };

  if (getDetailsLoading && replyId) {
    return <Loader />;
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize={true}
    >
      {({ setFieldValue, values, validateForm }) => (
        <div className="md:w-[100%] rounded-lg bg-white pb-[30px] filtermodal">
          <Form ref={formRef}>
            {validateFormRef && (
              <input
                type="hidden"
                ref={(el) => {
                  if (el && validateFormRef.current === null) {
                    (validateFormRef as any).current = async () => {
                      const errors = await validateForm();
                      return Object.keys(errors).length === 0;
                    };
                  }
                }}
              />
            )}
            <div>
              <ModalTextarea placeholder={t("COMMON.REPLY_IDEA")} name="text" />
            </div>
            <div>
              <UploadDocument
                name="images"
                label={t("COMMON.UPLOAD_IMAGE")}
                instructions={[t("COMMON.MAX_FILE_SIZE")]}
                multiple={true}
                accept="image/jpeg, image/png"
                setFieldValue={setFieldValue}
                existingFiles={modifiedReplyImages.map((file) => ({
                  id: file.id,
                  image: file.image,
                }))}
                onRemove={(index, isExisting) =>
                  handleRemoveExistingFile(
                    index,
                    isExisting,
                    "images",
                    setFieldValue,
                    values
                  )
                }
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  event.preventDefault();
                  const newFiles = event.target.files
                    ? Array.from(event.target.files)
                    : [];
                  const updatedFiles = [...(values.images || []), ...newFiles];
                  setFieldValue("images", updatedFiles);
                }}
              />
            </div>
          </Form>
        </div>
      )}
    </Formik>
  );
}

export default ReplyForm;
export { ReplyForm };
