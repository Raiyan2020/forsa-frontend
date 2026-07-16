"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

interface OpportunityTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: "volunteer" | "learn-serve") => void;
}

export default function OpportunityTypeModal({
  open,
  onClose,
  onSelect,
}: OpportunityTypeModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<"volunteer" | "learn-serve" | null>(null);

  const handleSelect = (type: "volunteer" | "learn-serve") => {
    setSelected(type);
  };

  const handleCreate = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("COMMON.OPPORTUNITIES")}
      size="sm"
    >
      <div className="flex flex-col items-center filtermodal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
          {/* Volunteer Card */}
          <div
            onClick={() => handleSelect("volunteer")}
            className={`rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors h-[200px] ${
              selected === "volunteer"
                ? "bg-[#29246d]"
                : "bg-primary-5/10 hover:bg-gray-100"
            }`}
          >
            <div className="relative w-12 h-12">
              <Image
                src="/assets/opportunities/Volunteer.svg"
                alt=""
                fill
                className={`transition-all object-contain ${
                  selected === "volunteer" ? "filter invert brightness-0" : ""
                }`}
                unoptimized
              />
            </div>
            <h3
              className={`font-semibold text-center pt-6 text-[22px] transition-colors ${
                selected === "volunteer" ? "text-white" : "text-[#29246d]"
              }`}
            >
              {t("COMMON.VOLUNTEER")}
            </h3>
          </div>

          {/* Learn and Serve Card */}
          <div
            onClick={() => handleSelect("learn-serve")}
            className={`rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors h-[200px] ${
              selected === "learn-serve"
                ? "bg-[#29246d]"
                : "bg-primary-5/10 hover:bg-gray-100"
            }`}
          >
            <div className="relative w-12 h-12">
              <Image
                src="/assets/opportunities/learnserve.svg"
                alt=""
                fill
                className={`transition-all object-contain ${
                  selected === "learn-serve" ? "filter invert brightness-0" : ""
                }`}
                unoptimized
              />
            </div>
            <h3
              className={`font-semibold text-center pt-6 text-[22px] transition-colors ${
                selected === "learn-serve" ? "text-white" : "text-[#29246d]"
              }`}
            >
              {t("COMMON.LEARN_SHARE")}
            </h3>
          </div>
        </div>

        {/* Create Button */}
        <Button
          onClick={handleCreate}
          className="xss:w-full"
          size="medium"
          variant="primary"
          type="button"
        >
          <span>{t("COMMON.CREATE")}</span>
        </Button>
      </div>
    </Modal>
  );
}
export type { OpportunityTypeModalProps };
