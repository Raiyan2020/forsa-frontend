"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin5Fill } from "react-icons/ri";

import Table, { TableColumn } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import {
  getOpportunityById,
  getRolesOfOpportunity,
} from "@/features/services/api";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { useRoleModalStore } from "@/store/roleModalStore";
import { toNumber } from "@/lib/helpers";
import CreateVolunteerRoleModal from "./CreateVolunteerRoleModal";
import DeleteVolunteerRoleModal from "./DeleteVolunteerRoleModal";
import ParticipantsMismatchModal from "./ParticipantsMismatchModal";

interface VolunteerRoleModalProps {
  opportunityId: string;
  dropdwonRefetch?: () => void;
  setMismatchChecker: (utils: {
    checkParticipantsMismatch: () => boolean;
  }) => void;
  showMismatchModal: boolean;
  setShowMismatchModal: React.Dispatch<React.SetStateAction<boolean>>;
  onclose: () => void;
}

export default function VolunteerRoleModal({
  opportunityId,
  dropdwonRefetch,
  setMismatchChecker,
  showMismatchModal,
  setShowMismatchModal,
  onclose,
}: VolunteerRoleModalProps) {
  const authToken = useAuthStore((s) => s.user?.auth_token);
  const selectedLanguage = useLanguageStore((s) => s.language);
  const openRoleModal = useRoleModalStore((s) => s.openRoleModal);
  const { t } = useTranslation();

  const [openForm, setOpenForm] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [shouldBlockNavigation, setShouldBlockNavigation] = useState(true);
  const [windowWidth, setWindowWidth] = useState(0);

  // Track window width for responsive icon sizes
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    data: roles,
    isLoading: rolesLoading,
    refetch,
  } = useQuery({
    queryKey: ["opportunity-roles", opportunityId],
    queryFn: () => getRolesOfOpportunity({ opportunity_id: opportunityId }),
    enabled: Boolean(authToken),
    refetchOnMount: "always",
  });

  const { data: opportunityData, isLoading: opportunityLoading } = useQuery({
    queryKey: ["opportunity-details", opportunityId],
    queryFn: () => getOpportunityById(opportunityId),
    enabled: Boolean(opportunityId),
    refetchOnMount: "always",
  });

  // Calculate total participants from roles
  const totalRoleParticipants =
    roles?.data?.reduce(
      (sum: number, role: any) =>
        sum + toNumber(role.total_participants_needed),
      0
    ) || 0;

  const opportunityParticipants = toNumber(
    opportunityData?.data?.participants_needed
  );
  const hasValidParticipants =
    opportunityParticipants === totalRoleParticipants;

  const participantsStillNeeded = Math.max(
    opportunityParticipants - totalRoleParticipants,
    0
  );

  const stopNavigationBlock = async () => {
    setShouldBlockNavigation(false);
  };

  // Shared validation function
  const shouldPreventAction = useCallback(() => {
    if (!shouldBlockNavigation || !roles?.data?.length) return false;
    return !hasValidParticipants;
  }, [shouldBlockNavigation, roles?.data, hasValidParticipants]);

  // Warn on tab close / reload while the roles don't add up.
  //
  // The React app also used React Router's `useBlocker` to intercept in-app
  // navigation. The App Router has no equivalent API, so in-app navigation is
  // guarded by the `setMismatchChecker` callback the parent calls instead.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (shouldPreventAction()) {
        openRoleModal();
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldPreventAction, openRoleModal]);

  // Provide mismatch checker to the parent (VolunteerList / VolunteerForm)
  useEffect(() => {
    setMismatchChecker?.({
      checkParticipantsMismatch: () => shouldPreventAction(),
    });
  }, [setMismatchChecker, shouldPreventAction]);

  // Handle save button click
  const handleSaveClick = () => {
    toast.success(t("COMMON.TOAST.ROLES_CREATED_SUCCESSFULLY"));
    onclose();
  };

  const columns: TableColumn[] = [
    {
      label: t("COMMON.ROLE"),
      key: selectedLanguage === "ar" ? "role_name_ar" : "role_name_en",
    },
    {
      label: t("COMMON.INSTRUCTION"),
      key: selectedLanguage === "ar" ? "instructions_ar" : "instructions_en",
    },
    { label: t("COMMON.NEEDED"), key: "total_participants_needed" },
    { label: t("COMMON.ACTION"), key: "Action" },
  ];

  if (rolesLoading || opportunityLoading) {
    return <Loader />;
  }

  return (
    <>
      <div className="text-center mb-4">
        {participantsStillNeeded > 0 ? (
          <p className="text-primary-5 font-semibold">
            {t("COMMON.PARTICIPANTS_STILL_NEEDED", {
              count: participantsStillNeeded,
            })}
          </p>
        ) : (
          <p className="text-green-500 font-semibold">
            {t("COMMON.ALL_ROLES_FILLED")}
          </p>
        )}
      </div>

      <div className="pb-8">
        <Table
          columns={columns}
          data={roles?.data ?? []}
          renderCell={(column, rowData) => {
            if (column.key === "Action") {
              return (
                <div className="flex items-center gap-4 mobilescreen:gap-2">
                  <button
                    className="text-primary-5 cursor-pointer"
                    onClick={() => {
                      setEditRoleId(rowData.id);
                      setOpenForm(true);
                    }}
                  >
                    <FiEdit size={windowWidth <= 767 ? 18 : 24} />
                  </button>
                  <button
                    className="text-primary-5 cursor-pointer"
                    onClick={() => {
                      setDeleteRoleId(rowData.id);
                      setOpenDeleteModal(true);
                    }}
                  >
                    <RiDeleteBin5Fill size={windowWidth <= 767 ? 18 : 24} />
                  </button>
                </div>
              );
            }
            return (
              <span
                className={
                  column.key === "total_participants_needed"
                    ? `${
                        selectedLanguage === "ar"
                          ? "mr-[7px] text-right"
                          : "ml-[13px] text-left"
                      } text-primary-4 h-[27px] w-[50px] rounded-xl border border-primary-5/10 bg-primary-5/10 flex items-center justify-center text-center text-[13px] overflow-hidden text-ellipsis whitespace-nowrap`
                    : "block"
                }
              >
                {rowData[column.key] ?? "-"}
              </span>
            );
          }}
        />
      </div>

      <div className="flex xss:flex-col justify-center w-full gap-5">
        <Button
          variant="primary"
          size="medium"
          className={`xss:!w-full ${
            hasValidParticipants ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={() => {
            if (!hasValidParticipants) {
              setOpenForm(true);
              setEditRoleId("");
            }
          }}
          disabled={hasValidParticipants}
        >
          {t("COMMON.ADD.ROLE")}
        </Button>
        <Button
          variant="primary"
          size="medium"
          className={`xss:!w-full ${
            !hasValidParticipants ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={hasValidParticipants ? handleSaveClick : undefined}
          disabled={!hasValidParticipants}
        >
          {t("COMMON.SAVE")}
        </Button>
      </div>

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={t(editRoleId ? "COMMON.EDIT.ROLE" : "COMMON.ADD.ROLE")}
        size="md"
      >
        <CreateVolunteerRoleModal
          setOpenForm={() => setOpenForm(false)}
          oppurtunityId={opportunityId}
          refetch={refetch}
          roleId={editRoleId ?? ""}
          dropdownRefetch={dropdwonRefetch}
          participantsStillNeeded={participantsStillNeeded}
        />
      </Modal>

      <Modal
        size="small"
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        title={t("COMMON.DELETE_CONFIRMATION_ROLE")}
      >
        <DeleteVolunteerRoleModal
          setOpenForm={() => setOpenDeleteModal(false)}
          refetch={refetch}
          roleId={deleteRoleId ?? ""}
          dropdownRefetch={dropdwonRefetch}
        />
      </Modal>

      <Modal
        size="small"
        open={showMismatchModal}
        onClose={() => setShowMismatchModal?.(false)}
        title={t("COMMON.PARTICIPANTS_MISMATCH")}
      >
        <ParticipantsMismatchModal
          onClose={() => setShowMismatchModal?.(false)}
          id={Number(opportunityId)}
          roleModalClose={onclose}
          refetch={refetch}
          stopNavigationBlock={stopNavigationBlock}
        />
      </Modal>
    </>
  );
}
