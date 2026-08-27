"use client";

import { Formik, Form, Field, FormikHelpers, FormikValues } from "formik";
import { useTranslation } from "react-i18next";
import ModalTextarea from "@/components/ui/ModalTextarea";
import UploadDocument from "@/components/ui/UploadDocument";
import Toggle from "@/components/ui/Toggle";
import { YupRequiredString } from "@/lib/schema";
import * as Yup from "yup";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  createCommunityPost,
  getCommunityPostById,
  updateCommunityPost,
} from "@/features/services/api";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useLanguageStore } from "@/store/languageStore";
import Loader from "@/components/ui/Loader";
import { useAuthStore } from "@/store/authStore";

interface PostFormValues {
  idea_text: string;
  images: File[];
  proposing_idea: boolean;
  is_funding_required: boolean;
}

interface CreatePostModalProps {
  onLoadingChange: (isLoading: boolean) => void;
  afterPostCreation: () => void;
  refetch: () => void;
  id?: string;
  formRef?: React.RefObject<HTMLFormElement | null>;
  validateFormRef?: React.RefObject<(() => Promise<boolean>) | null>;
}

function CreatePostModal({
  onLoadingChange,
  afterPostCreation,
  refetch,
  id,
  formRef,
  validateFormRef,
}: CreatePostModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const user = useAuthStore((s) => s.user);
  const user_type = user?.user_type;

  // Volunteer Team organizer condition from original
  const showToggles =
    user_type !== "organization" ||
    (user_type === "organization" &&
      (user as any)?.organizer_type_display?.value_en === "Volunteer Team");

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: createCommunityPost,
  });

  const updatePostMutation = useMutation({
    mutationFn: updateCommunityPost,
  });

  const [modifiedPostImages, setModifiedPostImages] = useState<
    Array<{ id: number; image: string }>
  >([]);
  const [existingImageIds, setExistingImageIds] = useState<number[]>([]);

  // Get details query
  const { data: apiResponse, isLoading: getDetailsLoading } = useQuery({
    queryKey: ["communityPost", id],
    queryFn: () => getCommunityPostById(id!),
    enabled: !!id,
  });

  const postData = Array.isArray(apiResponse?.data)
    ? apiResponse?.data[0]
    : apiResponse?.data;

  useEffect(() => {
    onLoadingChange?.(createPostMutation.isPending || updatePostMutation.isPending);
  }, [createPostMutation.isPending, updatePostMutation.isPending, onLoadingChange]);

  useEffect(() => {
    if (postData) {
      const oppImages =
        postData.post_images?.map((img: any) => ({
          id: img.id,
          image: img.image,
        })) || [];

      setModifiedPostImages(oppImages);
      setExistingImageIds(postData.post_images.map((img: any) => img.id));
    }
  }, [postData]);

  const initialValues: PostFormValues = {
    idea_text: postData?.[`idea_text_${selectedLanguage}`] || "",
    images: [],
    proposing_idea: id
      ? postData?.proposing_idea === false
        ? false
        : true
      : false,
    is_funding_required: id
      ? postData?.is_funding_required === false
        ? false
        : true
      : false,
  };

  const validationSchema = Yup.object({
    idea_text: Yup.string().concat(YupRequiredString),
  });

  const handleSubmit = async (
    values: PostFormValues,
    { resetForm }: FormikHelpers<PostFormValues>
  ) => {
    try {
      const formData = new FormData();
      formData.append(`idea_text_${selectedLanguage}`, values.idea_text);
      formData.append("primary_language", selectedLanguage);

      if (showToggles) {
        formData.append("proposing_idea", String(values.proposing_idea));
        formData.append(
          "is_funding_required",
          String(values.is_funding_required)
        );
      }

      if (id) {
        const hadOriginalImages = postData?.post_images?.length > 0;
        if (hadOriginalImages) {
          if (existingImageIds.length > 0) {
            existingImageIds.forEach((imgId) => {
              formData.append("existing_image_ids", imgId.toString());
            });
          }
        }
      }

      values?.images?.forEach((file) => {
        if (file instanceof File) {
          // The /posts/ endpoint expects the array-style key "images[]" so
          // multiple files are parsed as a list rather than a single value.
          formData.append(`images[]`, file);
        }
      });

      if (id) {
        await updatePostMutation.mutateAsync({ id, data: formData });
      } else {
        await createPostMutation.mutateAsync(formData);
      }

      toast.success(
        id
          ? t("COMMON.TOAST.COMMUNITY_POST_UPDATED")
          : t("COMMON.TOAST.COMMUNITY_POST_SUCCESS")
      );
      resetForm();
      afterPostCreation();
      refetch();
    } catch (err: any) {
      console.error("Post creation failed:", err);
      
      const errorData = err?.response?.data || err?.data;
      if (errorData && typeof errorData === 'object') {
        let errorDisplayed = false;
        Object.keys(errorData).forEach((key) => {
          const errorValue = errorData[key];
          if (errorValue && typeof errorValue === 'object' && (errorValue.en || errorValue.ar)) {
            const errorMessage = errorValue[selectedLanguage] || errorValue.en || errorValue.ar;
            if (errorMessage) {
              toast.error(errorMessage);
              errorDisplayed = true;
            }
          }
        });
        
        if (!errorDisplayed) {
          toast.error(
            id
              ? t("COMMON.TOAST.COMMUNITY_POST_UPDATE_FAILED")
              : t("COMMON.TOAST.COMMUNITY_POST_FAILED")
          );
        }
      } else {
        toast.error(
          id
            ? t("COMMON.TOAST.COMMUNITY_POST_UPDATE_FAILED")
            : t("COMMON.TOAST.COMMUNITY_POST_FAILED")
        );
      }
    }
  };

  const handleRemoveExistingFile = (
    index: number,
    isExistingFile: boolean,
    fieldName: string,
    setFieldValue: (field: string, value: any) => void,
    values: FormikValues
  ) => {
    if (isExistingFile) {
      const removedImageId = modifiedPostImages[index].id;
      setModifiedPostImages((prev) => prev.filter((_, i) => i !== index));
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

  if (getDetailsLoading) {
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
        <div className="md:w-[100%] rounded-lg bg-white pb-[20px] mobilescreen:pb-8 filtermodal">
          <Form className="createpost" ref={formRef}>
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
              <ModalTextarea
                placeholder={t("COMMON.SHARE_IDEA")}
                name="idea_text"
                className="pb-1"
              />
            </div>
            <div>
              <UploadDocument
                name="images"
                label={t("COMMON.UPLOAD_IMAGE")}
                instructions={[t("COMMON.MAX_FILE_SIZE")]}
                multiple={true}
                accept="image/jpeg, image/png"
                setFieldValue={setFieldValue}
                existingFiles={modifiedPostImages.map((file) => ({
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
            {showToggles && (
              // Only the Idea toggle is offered — the funding ("Needs Support")
              // toggle was dropped, so posts always submit is_funding_required false.
              <div className="py-6 mobilescreen:py-4 f6">
                <Field name="proposing_idea">
                  {({ field }: { field: any }) => (
                    <Toggle
                      label={t("COMMON.PROPOSING_IDEA")}
                      checked={field.value}
                      onChange={() => {
                        setFieldValue("proposing_idea", !field.value);
                        setFieldValue("is_funding_required", false);
                      }}
                      disabled={false}
                    />
                  )}
                </Field>
              </div>
            )}
          </Form>
        </div>
      )}
    </Formik>
  );
}

export default CreatePostModal;
