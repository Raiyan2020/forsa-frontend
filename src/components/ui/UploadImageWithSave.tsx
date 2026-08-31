"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";

interface UploadImageWithSaveProps {
  label: string;
  instructions?: string[];
  multiple?: boolean;
  accept?: string;
  value: File[];
  onChange: (files: File[]) => void;
  onRemove: (index: number) => void;
  onSave: () => void;
}

/**
 * Preview thumbnails come from object URLs, which have to be revoked when the
 * file list changes or the component unmounts — otherwise every re-pick leaks a
 * blob for the lifetime of the page.
 */
function useObjectUrls(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const created = files.map((file) => URL.createObjectURL(file));
    setUrls(created);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  return urls;
}

export default function UploadImageWithSave({
  label,
  instructions = [],
  multiple = true,
  accept,
  value,
  onChange,
  onRemove,
  onSave,
}: UploadImageWithSaveProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const previewUrls = useObjectUrls(value);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.target.files) {
      onChange([...value, ...Array.from(event.target.files)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border rounded-xl bg-[#29246D]/[0.03] text-center uplods">
      <div className="borderitm m-4 border-spacing-6 p-7">
        <div className="flex justify-center gap-1 items-center">
          <img src="/assets/profile/uploadic.svg" alt="" className="h-5 w-5" />
          <label className="text-[#1A1E25] text-lg font-semibold">{label}</label>
        </div>
        {instructions.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {instructions.map((instruction, index) => (
              <span className="text-[#1E1E1E]/70 text-lg xs:text-sm" key={index}>
                • {instruction}
                <br />
              </span>
            ))}
          </p>
        )}
        <div className="flex justify-center pt-4 gap-4 items-center">
          <input
            id="upload-image-input"
            type="file"
            multiple={multiple}
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <Button
            type="button"
            variant="secondarys"
            size="medium"
            onClick={(event) => {
              event.preventDefault();
              fileInputRef.current?.click();
            }}
          >
            {t("COMMON.UPLOAD")}
          </Button>
          {value.length > 0 && (
            <Button
              type="button"
              variant="primary"
              size="medium"
              onClick={onSave}
              className="ml-2"
            >
              {t("COMMON.SAVE")}
            </Button>
          )}
        </div>
        {value.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-[#1A1E25] mb-2">
              {t("COMMON.UPLOADED_FILES")}:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-h-40 overflow-y-auto">
              {value.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="rounded-lg p-2 flex flex-col items-center justify-center"
                >
                  <div className="w-20 h-20 relative flex items-center justify-center">
                    {previewUrls[index] && (
                      <img
                        src={previewUrls[index]}
                        alt={file.name}
                        className="object-cover w-full h-full rounded"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      className="absolute -top-2 -right-5 text-red-500 hover:text-red-700 text-lg"
                    >
                      ✕
                    </button>
                  </div>
                  <span className="text-xs text-[#1E1E1E]/70 mt-2 truncate w-20">
                    {file.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
