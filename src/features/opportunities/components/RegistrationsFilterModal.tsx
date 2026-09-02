"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import VolunteerFilterModal from "./VolunteerFilterModal";

interface RegistrationsFilterModalProps {
  open: boolean;
  onClose: () => void;
  opportunityId: string | undefined;
  currentFilters: { teams?: number[]; roles?: number[] };
  onApply: (filters: { teams?: string[]; roles?: string[] }) => void;
  onClear: () => void;
}

/** Team/role filter modal for the registrations list, including its own Apply/Clear footer state. */
export default function RegistrationsFilterModal({
  open,
  onClose,
  opportunityId,
  currentFilters,
  onApply,
  onClear,
}: RegistrationsFilterModalProps) {
  const { t } = useTranslation();
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const [isFilterEmpty, setIsFilterEmpty] = useState(true);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("COMMON.FILTER")}
      size="small"
      footer={
        <div className="flex xss:flex-col justify-center w-full gap-5">
          <Button
            variant="primary"
            size="medium"
            type="submit"
            onClick={() => {
              const form = document.querySelector("form");
              if (form) form.requestSubmit();
            }}
            disabled={!isFilterDirty}
            className="xss:!w-full"
          >
            {t("COMMON.APPLY")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            onClick={() => {
              onClear();
              setClearFiltersKey((previous) => previous + 1);
            }}
            disabled={isFilterEmpty}
            className="xss:!w-full"
          >
            {t("COMMON.CLEAR")}
          </Button>
        </div>
      }
    >
      <VolunteerFilterModal
        key={clearFiltersKey}
        opportunityId={opportunityId || ""}
        onFilterChange={onApply}
        currentFilters={{
          teams: currentFilters.teams ? currentFilters.teams.map(String) : undefined,
          roles: currentFilters.roles ? currentFilters.roles.map(String) : undefined,
        }}
        onDirtyChange={setIsFilterDirty}
        onEmptyChange={setIsFilterEmpty}
      />
    </Modal>
  );
}
