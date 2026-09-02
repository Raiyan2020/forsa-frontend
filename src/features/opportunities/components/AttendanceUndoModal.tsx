"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface AttendanceUndoModalProps {
  pendingUndo: { volunteerName: string } | null;
  onClose: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

/** Confirms clearing a volunteer's check-in before it's undone for good. */
export default function AttendanceUndoModal({
  pendingUndo,
  onClose,
  onConfirm,
  isConfirming,
}: AttendanceUndoModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={pendingUndo !== null}
      onClose={onClose}
      title={t("COMMON.UNDO_ATTENDANCE_TITLE")}
      size="small"
      footer={
        <div className="flex xss:flex-col justify-center w-full gap-5">
          <Button
            variant="primary"
            size="medium"
            className="xss:!w-full"
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {t("COMMON.CONFIRM")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            className="xss:!w-full"
            onClick={onClose}
          >
            {t("COMMON.CANCEL")}
          </Button>
        </div>
      }
    >
      <p className="text-center text-secondary-100">
        {pendingUndo?.volunteerName && (
          <span className="block font-bold pb-2">{pendingUndo.volunteerName}</span>
        )}
        {t("COMMON.UNDO_ATTENDANCE_CONFIRM")}
      </p>
    </Modal>
  );
}
