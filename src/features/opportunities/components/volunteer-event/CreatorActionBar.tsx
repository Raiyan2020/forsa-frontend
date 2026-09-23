"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Award, Lock, LockOpen, Pencil, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ManageActionIcon from "@/components/ui/ManageActionIcon";
import { Modal } from "@/components/ui/Modal";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import {
  closeVolunteerOpportunityRegistration,
  reopenVolunteerOpportunityRegistration,
  resubmitVolunteerOpportunity,
} from "@/features/opportunities/services/registrations";
import { sendVolunteerOpportunityCertificates } from "@/features/opportunities/services/opportunities";
import DeleteOpportunityModal from "../DeleteOpportunityModal";
import type { VolunteerEventView } from "./volunteerEventView";

/** Which confirmation is up. One at a time, so one piece of state. */
type PendingConfirm =
  | "primary"
  | "close"
  | "reopen"
  | "resubmit"
  | "certificates"
  | "delete";

interface CreatorActionBarProps {
  opportunityId: string;
  view: Pick<
    VolunteerEventView,
    | "isCreator"
    | "isRepostState"
    | "isRejected"
    | "showActionButton"
    | "actionLabelKey"
    | "closedByCreator"
    | "canCloseRegistration"
    | "canReopenRegistration"
    | "canSendCertificates"
    | "canRequestDeletion"
  >;
  /** Re-read the opportunity after an action changes it. */
  onChanged: () => void;
}

/**
 * The creator's icon row: Edit / Repost, the registration padlock, resubmit,
 * send certificates, and request deletion.
 *
 * Every control confirms before it acts. They are unlabelled glyphs, and an
 * unlabelled glyph should never act on the first tap — Repost in particular
 * reads as "edit" at a glance but creates a second opportunity.
 */
export default function CreatorActionBar({
  opportunityId,
  view,
  onChanged,
}: CreatorActionBarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const dismiss = () => setConfirm(null);

  const closeMutation = useMutation({
    mutationFn: () => closeVolunteerOpportunityRegistration(opportunityId),
  });
  const reopenMutation = useMutation({
    mutationFn: () => reopenVolunteerOpportunityRegistration(opportunityId),
  });
  const resubmitMutation = useMutation({
    mutationFn: () => resubmitVolunteerOpportunity(opportunityId),
  });
  const certificatesMutation = useMutation({
    mutationFn: () => sendVolunteerOpportunityCertificates(opportunityId),
  });

  /**
   * Run a mutation behind its confirmation. On success the dialog closes and
   * the page refetches; on failure it stays open so the creator can retry.
   */
  const runAndRefresh =
    (
      mutation: { mutateAsync: () => Promise<unknown> },
      successKey: string,
      failureKey: string
    ) =>
    async () => {
      try {
        await mutation.mutateAsync();
        toast.success(t(successKey));
        dismiss();
        onChanged();
      } catch (error) {
        console.error(failureKey, error);
        toast.error(t(failureKey));
      }
    };

  /**
   * Completion already issued certificates to everyone marked attended; this
   * is for attendance recorded afterwards. `certificates_sent: 0` is a normal
   * answer, not a failure.
   */
  const sendCertificates = async () => {
    try {
      const response = await certificatesMutation.mutateAsync();
      const sent = response?.data?.certificates_sent ?? 0;
      if (sent > 0) toast.success(t("COMMON.TOAST.CERTIFICATES_SENT", { count: sent }));
      else toast.info(t("COMMON.TOAST.NO_CERTIFICATES_TO_SEND"));
    } catch (error) {
      console.error("Send certificates failed:", error);
      toast.error(t("COMMON.TOAST.CERTIFICATES_SEND_FAILED"));
    } finally {
      // Closed either way — the toast carries the outcome, and leaving the
      // dialog up invites a second send of the same certificates.
      dismiss();
    }
  };

  /** Edit opens this opportunity; Repost starts a *new* one seeded from it. */
  const openForm = () => {
    dismiss();
    setNavState(
      NAV_STATE_KEYS.volunteerForm,
      view.isRepostState ? { id: opportunityId, isRepublish: true } : { id: opportunityId }
    );
    router.push("/volunteer-form");
  };

  const actionLabel = t(view.actionLabelKey);

  return (
    <>
      {/* Wraps rather than overflowing: on a narrow screen the title beside
          it takes the full width, so the row may need a second line. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {view.showActionButton && view.isCreator && (
          <ManageActionIcon
            label={actionLabel}
            icon={
              view.isRepostState ? (
                <RotateCcw className="h-5 w-5" />
              ) : (
                <Pencil className="h-5 w-5" />
              )
            }
            onClick={() => setConfirm("primary")}
          />
        )}

        {/* One padlock, two states: open → click to close; closed → accented,
            click to reopen. The accent replaces the «التسجيل مغلق» pill that
            other viewers see. */}
        {view.canCloseRegistration && (
          <ManageActionIcon
            label={t("COMMON.CLOSE_REGISTRATION")}
            icon={<LockOpen className="h-5 w-5" />}
            onClick={() => setConfirm("close")}
          />
        )}
        {view.canReopenRegistration && (
          <ManageActionIcon
            label={t("COMMON.REOPEN_REGISTRATION")}
            icon={<Lock className="h-5 w-5" />}
            onClick={() => setConfirm("reopen")}
            accent
          />
        )}
        {/* Closed, but past the toggle window — the state still has to be
            readable, so the lock stays as a disabled marker. */}
        {view.closedByCreator && view.isCreator && !view.canReopenRegistration && (
          <ManageActionIcon
            label={t("COMMON.REGISTRATION_CLOSED")}
            icon={<Lock className="h-5 w-5" />}
            disabled
            accent
          />
        )}

        {view.isRejected && (
          <ManageActionIcon
            label={t("COMMON.RESUBMIT_WITHOUT_EDIT")}
            icon={<RefreshCw className="h-5 w-5" />}
            onClick={() => setConfirm("resubmit")}
          />
        )}

        {view.canSendCertificates && (
          <ManageActionIcon
            label={t("COMMON.SEND_CERTIFICATES")}
            icon={<Award className="h-5 w-5" />}
            onClick={() => setConfirm("certificates")}
            disabled={certificatesMutation.isPending}
          />
        )}

        {view.canRequestDeletion && (
          <ManageActionIcon
            label={t("COMMON.DELETE_OPPORTUNITY")}
            icon={<Trash2 className="h-5 w-5" />}
            onClick={() => setConfirm("delete")}
            danger
          />
        )}
      </div>

      <ConfirmModal
        open={confirm === "primary"}
        onClose={dismiss}
        title={actionLabel}
        message={
          view.isRepostState
            ? t("COMMON.ARE_YOU_SURE_REPOST_OPPORTUNITY")
            : t("COMMON.ARE_YOU_SURE_EDIT_OPPORTUNITY")
        }
        onConfirm={openForm}
      />

      <ConfirmModal
        open={confirm === "close"}
        onClose={dismiss}
        title={t("COMMON.CLOSE_REGISTRATION")}
        message={t("COMMON.ARE_YOU_SURE_CLOSE_REGISTRATION")}
        onConfirm={runAndRefresh(
          closeMutation,
          "COMMON.TOAST.CLOSE_REGISTRATION_SUCCESS",
          "COMMON.TOAST.CLOSE_REGISTRATION_FAILED"
        )}
        isPending={closeMutation.isPending}
      />

      <ConfirmModal
        open={confirm === "reopen"}
        onClose={dismiss}
        title={t("COMMON.REOPEN_REGISTRATION")}
        message={t("COMMON.ARE_YOU_SURE_REOPEN_REGISTRATION")}
        onConfirm={runAndRefresh(
          reopenMutation,
          "COMMON.TOAST.REOPEN_REGISTRATION_SUCCESS",
          "COMMON.TOAST.REOPEN_REGISTRATION_FAILED"
        )}
        isPending={reopenMutation.isPending}
      />

      <ConfirmModal
        open={confirm === "resubmit"}
        onClose={dismiss}
        title={t("COMMON.RESUBMIT_WITHOUT_EDIT")}
        message={t("COMMON.ARE_YOU_SURE_RESUBMIT")}
        onConfirm={runAndRefresh(
          resubmitMutation,
          "COMMON.TOAST.RESUBMIT_SUCCESS",
          "COMMON.TOAST.RESUBMIT_FAILED"
        )}
        isPending={resubmitMutation.isPending}
      />

      {/* The one action here that leaves the app — volunteers get mail. */}
      <ConfirmModal
        open={confirm === "certificates"}
        onClose={dismiss}
        title={t("COMMON.SEND_CERTIFICATES")}
        message={t("COMMON.ARE_YOU_SURE_SEND_CERTIFICATES")}
        onConfirm={sendCertificates}
        isPending={certificatesMutation.isPending}
      />

      <Modal
        open={confirm === "delete"}
        onClose={dismiss}
        title={t("COMMON.DELETE_OPPORTUNITY")}
        size="small"
      >
        <DeleteOpportunityModal
          opportunityId={opportunityId}
          type="volunteer"
          setOpenModal={dismiss}
          refetch={onChanged}
        />
      </Modal>
    </>
  );
}
