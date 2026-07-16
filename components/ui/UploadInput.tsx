"use client";

import { useState, useEffect } from "react";
import { ErrorMessage, useField } from "formik";
import { FaPlus } from "react-icons/fa";

interface ExistingFile {
  id: number | string;
  name: string;
  url?: string;
}

interface UploadInputProps {
  name: string;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  existingFiles?: ExistingFile[];
  onRemoveExisting?: (id: number | string) => void;
}

const UploadInput: React.FC<UploadInputProps> = ({
  name,
  label,
  existingFiles,
  onRemoveExisting,
}) => {
  const [field, , helpers] = useField<File[]>(name);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
      helpers.setValue([...(field.value || []), ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    helpers.setValue(updatedFiles);
  };

  useEffect(() => {
    if (!field.value || field.value.length === 0) {
      setSelectedFiles([]);
    }
  }, [field.value]);

  const handlePlusClick = () => {
    document.getElementById(`${name}-input`)?.click();
  };

  const existingCount = existingFiles?.length ?? 0;
  const hasAnyFiles = existingCount > 0 || selectedFiles.length > 0;

  return (
    <>
      <div className="relative w-full border border-[#29246D1A] rounded-2xl p-3 bg-[#29246D08] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            className="text-primary-5 cursor-pointer"
            htmlFor={`${name}-input`}
          >
            {label}
          </label>
          <button
            type="button"
            onClick={handlePlusClick}
            className="text-primary-5"
          >
            <FaPlus size={20} />
          </button>
          <input
            id={`${name}-input`}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {hasAnyFiles && (
          <div className="flex flex-wrap gap-2">
            {existingFiles?.map((file) => (
              <div
                key={file.id}
                className="flex items-center text-primary-5 px-2 py-1 rounded-md"
              >
                {file.url ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-2 text-[#29246D] font-bold underline cursor-pointer"
                  >
                    {file.name}
                  </a>
                ) : (
                  <span className="mr-2 text-[#29246D] font-bold">{file.name}</span>
                )}
                {onRemoveExisting && (
                  <button
                    type="button"
                    onClick={() => onRemoveExisting(file.id)}
                    className="text-[#000000] ml-1"
                  >
                    &#x2715;
                  </button>
                )}
              </div>
            ))}
            {selectedFiles.map((_, index) => (
              <div
                key={index}
                className="flex items-center text-primary-5 px-2 py-1 rounded-md"
              >
                <span className="mr-2 text-[#29246D] font-bold">
                  {`Certificate ${existingCount + index + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-[#000000] ml-1"
                >
                  &#x2715;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </>
  );
};

export default UploadInput;
export { UploadInput };
