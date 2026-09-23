"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  /** `Modal` renders its title as text, so this is a string rather than a node. */
  title: string;
  message: ReactNode;
  onConfirm: () => void;
  /**
   * Disables both buttons while the action is in flight, so a slow request
   * cannot be confirmed twice or cancelled out from under itself.
   */
  isPending?: boolean;
}

/**
 * The "are you sure?" dialog.
 *
 * Every creator action on the detail screens — close or reopen registration,
 * resubmit, send certificates, edit/repost, delete an image — used to carry its
 * own copy of this markup, identical apart from the title, the sentence and
 * the handler. One component keeps the button order, spacing and pending
 * behaviour from drifting between them.
 */
export default function ConfirmModal({
  open,
  onClose,
  title,
  message,
  onConfirm,
  isPending = false,
}: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="text-center pb-6 text-lg">{message}</div>
      <div className="flex justify-center w-full gap-5">
        <Button
          variant="primary"
          type="button"
          size="medium"
          onClick={onConfirm}
          disabled={isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CONFIRM")}
        </Button>
        <Button
          variant="secondary"
          size="medium"
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="xss:!w-full"
        >
          {t("COMMON.CANCEL")}
        </Button>
      </div>
    </Modal>
  );
}
