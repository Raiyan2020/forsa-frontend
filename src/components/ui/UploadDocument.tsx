"use client";

import { useField, ErrorMessage, FormikErrors } from "formik";
import { useRef, useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/helpers";
import { API_BASE_URL } from "@/lib/api/config";
import { useLanguageStore } from "@/store/languageStore";

interface UploadInputProps {
  className?: string;
  name: string;
  label: string;
  instructions?: string[];
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setFieldValue?: (
    field: string,
    value: any,
    shouldValidate?: boolean
  ) => Promise<void | FormikErrors<any>>;
  multiple?: boolean;
  singleFileArray?: boolean;
  accept?: string;
  existingFiles?: Array<{ id: number; image: string }>;
  onRemove?: (index: number, isExistingFile: boolean) => void;
  enableCropping?: boolean;
  cropAspectRatio?: number;
  cropShape?: "rect" | "round";
  cropWidth?: number;
  cropHeight?: number;
  cropDisplayMode?: "opportunity" | "license" | "profile";
}

interface CropModalProps {
  imageSrc: string;
  onCropComplete: (croppedImage: File) => void;
  onCancel: () => void;
  aspectRatio: number;
  cropShape: "rect" | "round";
  cropWidth?: number;
  cropHeight?: number;
  cropDisplayMode?: "opportunity" | "license" | "profile";
}

const loadImageWithCORS = async (imageUrl: string): Promise<string> => {
  const tryWithProxy = async (): Promise<string> => {
    const proxyUrl = `${API_BASE_URL}/proxy-image/?url=${encodeURIComponent(imageUrl)}`;
    console.debug('Attempting to load image via proxy:', proxyUrl);

    const language = useLanguageStore.getState().language || 'en';

    const response = await fetch(proxyUrl, {
      method: 'GET',
      credentials: 'omit',
      headers: { 'x-lang': language, 'Accept-Language': language },
    });

    if (!response.ok) {
      throw new Error(`Proxy fetch failed: ${response.status}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const tryWithCrossOrigin = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Image load failed with crossOrigin'));
      img.src = imageUrl;
    });
  };

  try {
    return await tryWithProxy();
  } catch (err1) {
    console.warn('Proxy strategy failed, trying direct crossOrigin...', err1);
    try {
      return await tryWithCrossOrigin();
    } catch (err2) {
      console.error('All image loading strategies failed', err2);
      throw new Error('Unable to load image. Please try re-uploading the image.');
    }
  }
};

const createCroppedImage = async (
  imageSrc: string,
  pixelCrop: any,
  fileName: string
): Promise<File> => {
  const image = new Image();
  image.crossOrigin = "anonymous";

  return new Promise((resolve, reject) => {
    image.onload = () => {
      try {
        console.debug("createCroppedImage: image loaded", imageSrc);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          console.error("createCroppedImage: 2D context unavailable", imageSrc);
          return reject(new Error("2D context unavailable"));
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

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

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], fileName, { type: "image/jpeg" });
            console.debug("createCroppedImage: blob created", fileName);
            resolve(file);
          } else {
            console.error("createCroppedImage: toBlob returned null", imageSrc);
            reject(new Error("toBlob returned null"));
          }
        }, "image/jpeg", 0.9);
      } catch (err) {
        console.error("createCroppedImage: unexpected error", err);
        reject(err);
      }
    };

    image.onerror = (err) => {
      console.error("createCroppedImage: failed to load image", imageSrc, err);
      reject(new Error("Failed to load image"));
    };

    image.src = imageSrc;
  });
};

const CropModal: React.FC<CropModalProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio,
  cropShape,
  cropWidth,
  cropHeight,
  cropDisplayMode,
}) => {
  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onCancel();
  };

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!document.getElementById('image-preview-styles')) {
      const style = document.createElement('style');
      style.id = 'image-preview-styles';
      style.innerHTML = `
        .preview-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .reactEasyCrop_CropAreaGrid {
          background-image: 
            repeating-linear-gradient(
              90deg,
              transparent 0,
              transparent calc(33.33% - 0.5px),
              rgba(255, 255, 255, 0.5) calc(33.33% - 0.5px),
              rgba(255, 255, 255, 0.5) calc(33.33% + 0.5px),
              transparent calc(33.33% + 0.5px),
              transparent calc(66.66% - 0.5px),
              rgba(255, 255, 255, 0.5) calc(66.66% - 0.5px),
              rgba(255, 255, 255, 0.5) calc(66.66% + 0.5px),
              transparent calc(66.66% + 0.5px),
              transparent 100%
            ) !important;
        }
        .reactEasyCrop_CropAreaGrid::before,
        .reactEasyCrop_CropAreaGrid::after {
          content: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const styleTag = document.getElementById('image-preview-styles');
      if (styleTag) styleTag.remove();
    };
  }, []);

  const getBaseFrameDimensions = () => {
    const defaultWidth = 400;
    if (cropDisplayMode === 'opportunity') {
      const desktopAspect = 3.5;
      const width = cropWidth || defaultWidth;
      const height = Math.round(width / desktopAspect);
      return { width, height, aspectRatio: desktopAspect };
    } else if (cropDisplayMode === 'license') {
      const width = cropWidth || 300;
      return { width, height: width, aspectRatio: 1 };
    }
    const providedAspect = cropWidth && cropHeight ? cropWidth / cropHeight : aspectRatio;
    const height = cropWidth ? Math.round(cropWidth / providedAspect) : Math.round(defaultWidth / providedAspect);
    return {
      width: cropWidth || defaultWidth,
      height: cropHeight || height,
      aspectRatio: providedAspect
    };
  };

  const baseFrame = getBaseFrameDimensions();
  const cropperAspect = baseFrame.aspectRatio;

  const onCropCompleteCallback = useCallback(
    (_: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCropSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (croppedAreaPixels && imageSrc) {
      const croppedImage = await createCroppedImage(
        imageSrc,
        croppedAreaPixels,
        "cropped-image.jpg"
      );
      onCropComplete(croppedImage);
    }
  };

  const getCropperPaddingTop = () => {
    return `${(1 / cropperAspect) * 100}%`;
  };

  return (
    <Modal
      open={true}
      onClose={handleCancel}
      title={t("COMMON.CROP_IMAGE")}
      size="small"
      position="default"
      closeOnOutsideClick={false}
      showCloseButton={true}
    >
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-center">
          {t("COMMON.IMAGE_BORDER_SIZE")}
        </p>
        <p className="text-sm text-yellow-800 text-center">
          💡 {t("COMMON.IMAGE_BORDER_NOTE")}
        </p>
      </div>

      <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden mx-auto" style={{ paddingTop: getCropperPaddingTop() }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#f3f4f6' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={cropperAspect}
            cropShape={cropShape}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
            showGrid={true}
            objectFit="contain"
            style={{
              containerStyle: { width: '100%', height: '100%', position: 'relative' },
              cropAreaStyle: {
                border: '2px solid #fff',
                boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.7)',
                color: 'rgba(255, 255, 255, 0.7)'
              },
              mediaStyle: { maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }
            }}
          />
        </div>
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
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer no-custom-background"
          />
        </div>

        <div className="text-center text-sm bg-blue-50 p-3 rounded-lg space-y-2">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            {t("COMMON.DRAG_TO_MOVE")}
          </div>
          <p className="text-xs text-blue-700 font-medium">
            {t("COMMON.CROP_FRAME_EXACT_MATCH")}
          </p>
          <p className="text-xs text-blue-700">
            {cropDisplayMode === "opportunity" ? t("COMMON.OPPORTUNITY_CROP_TIP") : t("COMMON.LICENSE_CROP_TIP")}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" size="medium" onClick={handleCancel}>
          {t("COMMON.CANCEL")}
        </Button>
        <Button type="button" variant="primary" size="medium" onClick={handleCropSave}>
          {t("COMMON.SAVE")}
        </Button>
      </div>
    </Modal>
  );
};

const UploadDocument: React.FC<UploadInputProps> = ({
  name,
  label,
  instructions = [],
  onChange,
  setFieldValue,
  multiple = true,
  singleFileArray = false,
  accept,
  existingFiles = [],
  onRemove,
  enableCropping = false,
  cropAspectRatio = 16 / 9,
  cropShape = "rect",
  cropWidth,
  cropHeight,
  cropDisplayMode,
}) => {
  const [field] = useField(name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingIsExisting, setEditingIsExisting] = useState<boolean>(false);
  const [originalImagesMap, setOriginalImagesMap] = useState<Map<string, string>>(new Map());
  const [currentEditKey, setCurrentEditKey] = useState<string>("");
  const pendingCropFilesRef = useRef<File[]>([]);
  const croppedBatchFilesRef = useRef<File[]>([]);

  const closeCropModal = () => {
    setShowCropModal(false);
    setImageToCrop("");
    setCurrentEditKey("");
    setEditingIndex(null);
    setEditingIsExisting(false);
  };

  const openCropModalForFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalData = e.target?.result as string;
      const uniqueKey = `${Date.now()}_${file.lastModified}_${file.name}`;
      setOriginalImagesMap((prev) =>
        new Map(prev).set(uniqueKey, originalData)
      );
      setImageToCrop(originalData);
      setCurrentEditKey(uniqueKey);
      setShowCropModal(true);
      setEditingIndex(null);
      setEditingIsExisting(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (onChange) onChange(event);

    if (fileInputRef.current && event.target.files) {
      const newFiles = Array.from(event.target.files);
      const selectedFiles =
        multiple && !singleFileArray ? newFiles : newFiles.slice(0, 1);

      if (
        enableCropping &&
        selectedFiles.length > 0 &&
        selectedFiles.every((file) => file.type.startsWith("image/"))
      ) {
        croppedBatchFilesRef.current = [];
        pendingCropFilesRef.current = selectedFiles.slice(1);
        openCropModalForFile(selectedFiles[0]);
      } else {
        if (setFieldValue) {
          if (singleFileArray) setFieldValue(name, newFiles.slice(0, 1));
          else if (multiple) {
            const current = Array.isArray(field.value) ? field.value : [];
            setFieldValue(name, [...current, ...newFiles]);
          } else {
            setFieldValue(name, newFiles[0] || null);
          }
        }
      }

      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = (croppedImage: File) => {
    (croppedImage as any).__originalKey = currentEditKey;

    if (editingIndex === null) {
      const croppedFiles = [...croppedBatchFilesRef.current, croppedImage];
      const [nextFile, ...remainingFiles] = pendingCropFilesRef.current;

      if (nextFile) {
        croppedBatchFilesRef.current = croppedFiles;
        pendingCropFilesRef.current = remainingFiles;
        closeCropModal();
        openCropModalForFile(nextFile);
        return;
      }

      if (setFieldValue) {
        if (singleFileArray) {
          setFieldValue(name, croppedFiles.slice(0, 1));
        } else if (multiple) {
          const current = Array.isArray(field.value) ? field.value : [];
          setFieldValue(name, [...current, ...croppedFiles]);
        } else {
          setFieldValue(name, croppedFiles[0] || null);
        }
      }

      croppedBatchFilesRef.current = [];
      pendingCropFilesRef.current = [];
      closeCropModal();
      return;
    }

    if (setFieldValue) {
      if (editingIsExisting) {
        if (onRemove) onRemove(editingIndex, true);
        if (multiple || singleFileArray) {
          const current = Array.isArray(field.value) ? field.value : [];
          setFieldValue(name, [...current, croppedImage]);
        } else {
          setFieldValue(name, croppedImage);
        }
      } else {
        if (multiple || singleFileArray) {
          const current = Array.isArray(field.value) ? field.value : [];
          const updated = current.map((f: any, i: number) =>
            i === editingIndex ? croppedImage : f
          );
          setFieldValue(name, updated);
        } else {
          setFieldValue(name, croppedImage);
        }
      }
    }
    closeCropModal();
  };

  const handleCropCancel = () => {
    pendingCropFilesRef.current = [];
    croppedBatchFilesRef.current = [];
    closeCropModal();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (indexToRemove?: number, isExistingFile?: boolean) => {
    if (!setFieldValue) return;
    if (isExistingFile && indexToRemove !== undefined && onRemove) onRemove(indexToRemove, true);
    else if (multiple && Array.isArray(field.value)) {
      setFieldValue(name, field.value.filter((_: any, i: number) => i !== indexToRemove));
    } else {
      setFieldValue(name, null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isImageFile = (file: any) => {
    if (!file) return false;
    if (typeof file === "string") return file.match(/\.(jpg|jpeg|png)$|data:image|http/) !== null;
    return file instanceof File && file.type.startsWith("image");
  };

  const getPreviewUrl = (file: File | string) => typeof file === "string" ? file : URL.createObjectURL(file);

  const showUploadButton = (multiple && !singleFileArray) ||
    ((!multiple || singleFileArray) && existingFiles.length === 0 &&
      (!field.value || (Array.isArray(field.value) && field.value.length === 0)));

  const hasFiles = existingFiles.length > 0 ||
    (field.value && (multiple || singleFileArray ? Array.isArray(field.value) && field.value.length > 0 : !!field.value));

  return (
    <>
      <div className="border rounded-xl bg-[#29246D]/[0.03] text-center uplods">
        <div className="borderitm m-4 border-spacing-6 p-7">
          <div className="flex justify-center gap-1 items-center">
            <img src="/assets/profile/uploadicn.svg" className="h-5 w-5" alt="Upload Icon" />
            <label className="text-[#1A1E25] text-lg font-semibold">{label}</label>
          </div>

          {instructions.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {instructions.map((inst, i) => <span key={i} className="text-[#1E1E1E]/70 text-lg xs:text-sm">• {inst}<br /></span>)}
            </p>
          )}

          {enableCropping && (
            <div className="text-sm text-primary-5 mt-2 p-2 rounded-lg">
              <p>{t("COMMON.CROP_INFO")}</p>
              {cropDisplayMode === "opportunity" && <p className="mt-1 text-xs">{t("COMMON.CROP_FRAME_INFO")}</p>}
            </div>
          )}

          {showUploadButton && (
            <>
              <input id={`${name}-input`} type="file" multiple={multiple} accept={accept} className="hidden" onChange={handleFileChange} ref={fileInputRef} />
              <div className="flex justify-center pt-4">
                <Button type="button" variant="secondarys" size="medium" onClick={() => document.getElementById(`${name}-input`)?.click()}>
                  {t("COMMON.UPLOAD")}
                </Button>
              </div>
            </>
          )}

          {hasFiles && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-[#1A1E25] mb-2">
                {t("COMMON.UPLOADED")} {multiple && !singleFileArray ? t("COMMON.FILES") : t("COMMON.FILE")}:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-h-40 overflow-y-auto">
                {existingFiles.map((file, idx) => (
                  <div key={`existing-${file.id}`} className="rounded-lg p-2 flex flex-col items-center">
                    <div className="w-20 h-20 relative">
                      {isImageFile(file.image) ? (
                        <img src={file.image} alt="" className="object-cover w-full h-full rounded cursor-pointer"
                          onClick={async () => {
                            try {
                              console.debug('Existing image clicked, loading:', file.image);
                              const dataUrl = await loadImageWithCORS(file.image);
                              const key = `existing_${file.id}_${Date.now()}`;
                              setOriginalImagesMap(prev => new Map(prev).set(key, dataUrl));
                              setImageToCrop(dataUrl);
                              setCurrentEditKey(key);
                              setShowCropModal(true);
                              setEditingIndex(idx);
                              setEditingIsExisting(true);
                            } catch (err: any) {
                              console.error('Failed to load existing image for cropping:', file.image, err);
                              alert(err.message || 'Unable to load image for editing. Please re-upload the image.');
                            }
                          }} />
                      ) : (
                        <div className="bg-gray-200 w-full h-full rounded flex items-center justify-center"><span className="text-xs text-gray-500">File</span></div>
                      )}
                      <button type="button" onClick={() => removeFile(idx, true)} className="absolute -top-2 -right-5 text-red-500 text-lg">✕</button>
                    </div>
                    <span className="text-xs text-[#1E1E1E]/70 mt-2 truncate w-20">{file.image.split("/").pop()}</span>
                  </div>
                ))}

                {multiple && Array.isArray(field.value) && field.value.map((file: File, idx: number) => (
                  <div key={`new-${idx}`} className="rounded-lg p-2 flex flex-col items-center">
                    <div className="w-20 h-20 relative">
                      {isImageFile(file) ? (
                        <img src={getPreviewUrl(file)} alt={file.name} className="object-cover w-full h-full rounded cursor-pointer"
                          onClick={() => {
                            const key = (file as any).__originalKey;
                            const orig = key ? originalImagesMap.get(key) : null;
                            setImageToCrop(orig || getPreviewUrl(file));
                            setCurrentEditKey(key || `${Date.now()}_${file.name}`);
                            setShowCropModal(true);
                            setEditingIndex(idx);
                            setEditingIsExisting(false);
                          }} />
                      ) : (
                        <div className="bg-gray-200 w-full h-full rounded flex items-center justify-center"><span className="text-xs">File</span></div>
                      )}
                      <button type="button" onClick={() => removeFile(idx)} className="absolute -top-2 -right-5 text-red-500 text-lg">✕</button>
                    </div>
                    <span className="text-xs text-[#1E1E1E]/70 mt-2 truncate w-20">{file.name}</span>
                  </div>
                ))}

                {!multiple && field.value && !Array.isArray(field.value) && (
                  <div className="rounded-lg p-2 flex flex-col items-center">
                    <div className="w-20 h-20 relative">
                      {isImageFile(field.value) ? (
                        <img src={getPreviewUrl(field.value)} alt={(field.value as File).name} className="object-cover w-full h-full rounded cursor-pointer"
                          onClick={() => {
                            const key = (field.value as any).__originalKey;
                            const orig = key ? originalImagesMap.get(key) : null;
                            setImageToCrop(orig || getPreviewUrl(field.value));
                            setCurrentEditKey(key || `${Date.now()}_${(field.value as File).name}`);
                            setShowCropModal(true);
                            setEditingIndex(0);
                            setEditingIsExisting(false);
                          }} />
                      ) : (
                        <div className="bg-gray-200 w-full h-full rounded flex items-center justify-center"><span className="text-xs">File</span></div>
                      )}
                      <button type="button" onClick={() => removeFile()} className="absolute -top-2 -right-5 text-red-500 text-lg">✕</button>
                    </div>
                    <span className="text-xs text-[#1E1E1E]/70 mt-2 truncate w-20">{(field.value as File).name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <ErrorMessage name={name} component="div" className="text-red-500 text-sm mt-1" />
        </div>
      </div>

      {showCropModal && (
        <CropModal
          key={currentEditKey}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={cropAspectRatio}
          cropShape={cropShape}
          cropWidth={cropWidth}
          cropHeight={cropHeight}
          cropDisplayMode={cropDisplayMode}
        />
      )}
    </>
  );
};

export default UploadDocument;
export { UploadDocument };
