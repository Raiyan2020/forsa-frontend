"use client";

import { useEffect, useState } from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as Yup from "yup";

import ModalTextarea from "@/components/ui/ModalTextarea";
import UploadDocument from "@/components/ui/UploadDocument";
import Loader from "@/components/ui/Loader";
import { createCommunityReply, getReplyById, updateReply } from "@/features/community/services/communityApi";
import { YupRequiredString, YupStringMaxLength } from "@/features/shared/schemas";
import { useLanguageStore } from "@/store/languageStore";

interface ReplyImage {
  id: number;
  image: string;
}

interface ReplyOfReplyFormValues {
  text: string;
  images: File[];
  [key: string]: any;
}

interface ReplyOfReplyFormProps {
  postId: string;
  replyId: string;
  onLoadingChange?: (isLoading: boolean) => void;
  afterReplyCreation: () => void;
  replyOfReplyId?: string; // For edit mode
  refetch?: () => void; // For refreshing replies list
  formRef?: React.RefObject<HTMLFormElement | null>;
  validateFormRef?: React.RefObject<(() => Promise<boolean>) | null>;
}

export default function ReplyOfReplyForm({
  postId,
  replyId,
  onLoadingChange,
  afterReplyCreation,
  replyOfReplyId,
  refetch,
  formRef,
  validateFormRef,
}: ReplyOfReplyFormProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const createReplyMutation = useMutation({ mutationFn: createCommunityReply });
  const updateReplyMutation = useMutation({ mutationFn: updateReply });

  const [modifiedReplyImages, setModifiedReplyImages] = useState<ReplyImage[]>(
    []
  );
  const [existingImageIds, setExistingImageIds] = useState<number[]>([]);

  const { data: apiResponse, isLoading: getDetailsLoading } = useQuery({
    queryKey: ["reply", replyOfReplyId],
    queryFn: () => getReplyById(replyOfReplyId as string),
    enabled: Boolean(replyOfReplyId),
  });

  const replyData =
    apiResponse?.data &&
    (Array.isArray(apiResponse.data) ? apiResponse.data[0] : apiResponse.data);

  const createLoading = createReplyMutation.isPending;
  const updateLoading = updateReplyMutation.isPending;

  useEffect(() => {
    onLoadingChange?.(createLoading || updateLoading || getDetailsLoading);
  }, [createLoading, updateLoading, getDetailsLoading, onLoadingChange]);

  useEffect(() => {
    if (replyData) {
      const replyImages: ReplyImage[] =
        replyData.reply_images?.map((img: any) => ({
          id: img.id,
          image: img.image,
        })) || [];

      setModifiedReplyImages(replyImages);
      setExistingImageIds(replyImages.map((img) => img.id));
    }
  }, [replyData]);

  const initialValues: ReplyOfReplyFormValues = {
    text: replyData?.[`text_${selectedLanguage}`] || "",
    images: [],
  };

  const validationSchema = Yup.object({
    text: YupStringMaxLength(280).concat(YupRequiredString),
  });

  const handleSubmit = async (
    values: ReplyOfReplyFormValues,
    { resetForm }: FormikHelpers<ReplyOfReplyFormValues>
  ) => {
    try {
      const formData = new FormData();
      formData.append(`text_${selectedLanguage}`, values.text);
      formData.append("primary_language", selectedLanguage);
      formData.append("post", postId);
      formData.append("parent", replyId);

      // Handle existing images for update
      if (replyOfReplyId && existingImageIds.length > 0) {
        existingImageIds.forEach((id) => {
          formData.append("existing_image_ids[]", id.toString());
        });
      }

      // Add new images
      values.images
        .filter((file) => file instanceof File)
        .forEach((file) => {
          formData.append("images[]", file);
        });

      if (replyOfReplyId) {
        await updateReplyMutation.mutateAsync({ id: replyOfReplyId, formData });
      } else {
        await createReplyMutation.mutateAsync(formData);
      }

      toast.success(
        t(
          replyOfReplyId
            ? "COMMON.TOAST.REPLY_OF_REPLY_UPDATE_SUCCESS"
            : "COMMON.TOAST.COMMUNITY_POST_REPLY_OF_REPLY_SUCCESS"
        )
      );

      afterReplyCreation();
      resetForm();
      refetch?.();
    } catch (err: any) {
      console.error("Reply operation failed:", err);

      // Handle structured error response
      const payload = err?.response?.data;
      let errorDisplayed = false;
      if (payload && typeof payload === "object") {
        Object.keys(payload).forEach((key) => {
          const errorValue = payload[key];
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
      }

      if (!errorDisplayed) {
        toast.error(
          t(
            replyOfReplyId
              ? "COMMON.TOAST.REPLY_OF_REPLY_UPDATE_FAILED"
              : "COMMON.TOAST.COMMUNITY_POST_REPLY_OF_REPLY_FAILED"
          )
        );
      }
    }
  };

  const handleRemoveExistingFile = (
    index: number,
    isExistingFile: boolean,
    fieldName: string,
    setFieldValue: (field: string, value: any) => void,
    values: ReplyOfReplyFormValues
  ) => {
    if (isExistingFile && modifiedReplyImages[index]) {
      const removedImageId = modifiedReplyImages[index].id;

      setModifiedReplyImages((prev) => prev.filter((_, i) => i !== index));
      setExistingImageIds((prev) => prev.filter((id) => id !== removedImageId));

      setFieldValue(
        fieldName,
        values.images.filter((file) => file instanceof File)
      );
    }
  };

  if (getDetailsLoading && replyOfReplyId) {
    return <Loader />;
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize
    >
      {({ setFieldValue, values, validateForm }) => (
        <div className="md:w-[100%] rounded-lg bg-white pb-[30px] filtermodal">
          <Form ref={formRef}>
            {validateFormRef && (
              <input
                type="hidden"
                ref={() => {
                  if (validateFormRef.current === null) {
                    validateFormRef.current = async () => {
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
                multiple
                accept="image/jpeg, image/png"
                setFieldValue={setFieldValue}
                existingFiles={modifiedReplyImages}
                onRemove={(index: number, isExisting: boolean) =>
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
                  setFieldValue("images", [...values.images, ...newFiles]);
                }}
              />
            </div>
          </Form>
        </div>
      )}
    </Formik>
  );
}
