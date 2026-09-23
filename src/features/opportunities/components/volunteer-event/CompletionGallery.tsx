"use client";

/* eslint-disable @next/next/no-img-element -- remote uploads, lightbox anchors */

import { useEffect, useState } from "react";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { Fancybox as NativeFancybox } from "@fancyapps/ui";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FiDownload } from "react-icons/fi";
import { MdDelete } from "react-icons/md";
import ConfirmModal from "@/components/ui/ConfirmModal";
import UploadImageWithSave from "@/components/ui/UploadImageWithSave";
import {
  deleteOpportunityImage,
  downloadOpportunityImage,
  updateVolunteerOpportunityImages,
} from "@/features/opportunities/services/opportunities";
import { useLanguageStore } from "@/store/languageStore";
import type { VolunteerOpportunityDetail } from "./types";

/** The client's cap on photos added after an opportunity completes. */
const MAX_COMPLETION_IMAGES = 10;

interface CompletionGalleryProps {
  data: VolunteerOpportunityDetail;
  isCreator: boolean;
  onChanged: () => void;
}

/**
 * Photos from the day, added by the creator once the opportunity is complete.
 * Anyone can view and download them; only the creator uploads or deletes.
 *
 * Separate from the announcement image, which is single and cropped 4:5 on the
 * publish form (BE-76). This gallery is unlimited in kind but capped at ten.
 */
export default function CompletionGallery({
  data,
  isCreator,
  onChanged,
}: CompletionGalleryProps) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const id = String(data.id);
  const galleryId = `opportunity-gallery-${id}`;

  const uploadMutation = useMutation({ mutationFn: updateVolunteerOpportunityImages });
  const deleteMutation = useMutation({ mutationFn: deleteOpportunityImage });
  const downloadMutation = useMutation({ mutationFn: downloadOpportunityImage });

  // Fancybox previews the gallery in place rather than in a new tab.
  useEffect(() => {
    NativeFancybox.bind(`[data-fancybox="${galleryId}"]`, {
      showClass: "fancybox-zoomIn",
      hideClass: "fancybox-zoomOut",
    });
    return () => {
      NativeFancybox.unbind(`[data-fancybox="${galleryId}"]`);
      NativeFancybox.close();
    };
  }, [galleryId]);

  const images = data.opportunity_images?.filter((image) => image.is_after_completed) ?? [];
  const isCompleted = data.opportunity_status === "completed";
  const canUpload = isCompleted && isCreator && images.length < MAX_COMPLETION_IMAGES;

  if (!(isCompleted && isCreator) && images.length === 0) return null;

  const upload = async (files: File[]) => {
    // Checked against the server's count, which also sees images another
    // session added since this page loaded.
    const remaining = MAX_COMPLETION_IMAGES - (data.after_completed_images_count || 0);
    if (files.length > remaining) {
      toast.error(t("COMMON.MAX_FILES_EXCEEDED"));
      setPendingFiles([]);
      return;
    }

    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`new_opportunity_images_${index}`, file);
      formData.append(`new_opportunity_images_is_after_completed_${index}`, "true");
    });

    try {
      await uploadMutation.mutateAsync({ id, formData });
      toast.success(t("COMMON.TOAST.OPPORTUNITY_IMAGE_UPLOAD_SUCCESS"));
      setPendingFiles([]);
      onChanged();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(t("COMMON.TOAST.OPPORTUNITY_IMAGE_UPLOAD_FAILED"));
    }
  };

  const confirmDelete = async () => {
    if (!deletingImageId) return;
    try {
      await deleteMutation.mutateAsync({ image_ids: [deletingImageId], type: "volunteer" });
      toast.success(t("COMMON.TOAST.DELETE_IMAGE_SUCCESS"));
      setDeletingImageId(null);
      onChanged();
    } catch {
      toast.error(t("COMMON.TOAST.DELETE_IMAGE_FAILED"));
    }
  };

  const download = async (imageId: number) => {
    try {
      const { blob, filename } = await downloadMutation.mutateAsync({
        image_id: imageId,
        fallbackName: `opportunity_${data.id}`,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t("COMMON.DOWNLOAD_SUCCESS"));
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t("COMMON.DOWNLOAD_FAILURE"));
    }
  };

  return (
    <>
      <div className="pt-[50px]">
        {(canUpload || images.length > 0) && (
          <h3 className="2xl:text-xl lg:text-base text-base font-bold text-primary-5 mb-3 flex gap-2 items-center">
            <div dir="rtl">
              <img
                src="/assets/voluneteerevent/rightarrows.svg"
                alt=""
                className={language === "ar" ? "rotate-rtl" : ""}
              />
            </div>
            {t("COMMON.OPPORTUNITY_IMAGE")}
          </h3>
        )}

        {canUpload && (
          <div>
            <UploadImageWithSave
              label={t("COMMON.UPLOAD_IMAGE")}
              instructions={[t("COMMON.MAX_FILE_SIZE")]}
              multiple
              accept="image/jpeg, image/png"
              value={pendingFiles}
              onChange={(files) => {
                if (files.length > MAX_COMPLETION_IMAGES - images.length) {
                  toast.error(t("COMMON.MAX_FILES_EXCEEDED"));
                  return;
                }
                setPendingFiles(files);
              }}
              onRemove={(index) =>
                setPendingFiles((previous) => previous.filter((_, i) => i !== index))
              }
              onSave={() => {
                if (pendingFiles.length > 0) upload(pendingFiles);
              }}
            />
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="relative mt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <a
                  href={image.image}
                  data-fancybox={galleryId}
                  className="block cursor-zoom-in"
                  title={t("COMMON.CLICK_TO_VIEW")}
                >
                  <img
                    src={image.image}
                    alt="Completed opportunity"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                </a>
                <div className={`absolute top-2 right-2 ${isCreator ? "flex gap-2" : ""}`}>
                  <button
                    type="button"
                    className="w-6 h-6 flex items-center justify-center rounded-full border border-blue-400 bg-white text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-blue-100"
                    onClick={() => download(image.id)}
                    title={t("COMMON.DOWNLOAD_IMAGE")}
                  >
                    <FiDownload size={14} />
                  </button>
                  {isCreator && (
                    <button
                      type="button"
                      className="w-6 h-6 flex items-center justify-center rounded-full border border-red-400 bg-white text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-100"
                      onClick={() => setDeletingImageId(image.id)}
                      title={t("COMMON.DELETE_IMAGE")}
                    >
                      <MdDelete size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={deletingImageId !== null}
        onClose={() => setDeletingImageId(null)}
        title={t("COMMON.DELETE_IMAGE")}
        message={t("COMMON.ARE_YOU_SURE_DELETE_IMAGE")}
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
