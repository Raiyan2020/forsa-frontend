"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { useTranslation } from "react-i18next";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/** Renders the selected crop region to a JPEG File. */
export async function createCroppedImage(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  fileName: string
): Promise<File> {
  const image = new window.Image();
  image.src = imageSrc;

  return new Promise((resolve) => {
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // Ensure we have the exact dimensions for the cropped area
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Clear the canvas so transparency is handled correctly
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the cropped portion with high quality
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      // Convert to blob with higher quality (0.9) to preserve details
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], fileName, { type: "image/jpeg" }));
          }
        },
        "image/jpeg",
        0.9
      );
    };
  });
}

interface ProfilePictureCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedImage: File) => void;
  onCancel: () => void;
}

export default function ProfilePictureCropModal({
  imageSrc,
  onCropComplete,
  onCancel,
}: ProfilePictureCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { t } = useTranslation();

  // Generate live preview whenever crop changes
  const generatePreview = useCallback(async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    try {
      const croppedImage = await createCroppedImage(
        imageSrc,
        croppedAreaPixels,
        "preview.jpg"
      );

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(croppedImage);
      });
    } catch (error) {
      console.error("Failed to generate preview:", error);
    }
  }, [croppedAreaPixels, imageSrc]);

  const onCropCompleteCallback = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // Update preview when crop changes
  useEffect(() => {
    if (croppedAreaPixels) {
      generatePreview();
    }
  }, [croppedAreaPixels, generatePreview]);

  // Release the last preview URL on unmount
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const handleCropSave = async () => {
    if (croppedAreaPixels && imageSrc) {
      const croppedImage = await createCroppedImage(
        imageSrc,
        croppedAreaPixels,
        "cropped-profile.jpg"
      );
      onCropComplete(croppedImage);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title={t("COMMON.CROP_IMAGE")}
      size="small"
      position="default"
      closeOnOutsideClick={false}
      showCloseButton
    >
      {/* Cropper */}
      <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          onCropChange={setCrop}
          onCropComplete={onCropCompleteCallback}
          onZoomChange={setZoom}
          showGrid
          objectFit="contain"
          style={{
            containerStyle: {
              width: "100%",
              height: "100%",
              backgroundColor: "#f3f4f6",
              position: "relative",
            },
            cropAreaStyle: {
              border: "2px solid #fff",
              boxShadow: "0 0 0 9999em rgba(0, 0, 0, 0.7)",
              color: "rgba(255, 255, 255, 0.7)",
            },
            mediaStyle: {
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
            },
          }}
        />
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("COMMON.ZOOM")}
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => {
              setZoom(Number(e.target.value));
              // Regenerate the preview so it tracks the new zoom
              if (croppedAreaPixels) generatePreview();
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer no-custom-background"
          />
        </div>

        {/* Helpful tip message */}
        <div className="text-center text-sm bg-blue-50 p-3 rounded-lg space-y-2">
          <div
            className="flex items-center justify-center gap-2 text-blue-600"
            style={{ direction: "ltr" }}
          >
            {t("COMMON.DRAG_TO_MOVE")}
          </div>
          <p className="text-xs text-blue-700 font-medium">
            {t("COMMON.CROP_FRAME_EXACT_MATCH")}
          </p>
          <p className="text-xs text-blue-700">{t("COMMON.PROFILE_CROP_TIP")}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button
          type="button"
          variant="secondary"
          size="medium"
          onClick={onCancel}
        >
          {t("COMMON.CANCEL")}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="medium"
          onClick={handleCropSave}
        >
          {t("COMMON.SAVE")}
        </Button>
      </div>
    </Modal>
  );
}
