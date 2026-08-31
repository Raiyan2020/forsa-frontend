"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin5Fill } from "react-icons/ri";

import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import { getTeams } from "@/features/services/api";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import CreateTeam from "./CreateTeam";
import DeleteTeam from "./DeleteTeam";

interface TeamModalProps {
  opportunityId: string;
  dropdownRefetch?: () => void;
}

export default function TeamModal({
  opportunityId,
  dropdownRefetch,
}: TeamModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const authToken = useAuthStore((s) => s.user?.auth_token);

  const [openForm, setOpenForm] = useState(false);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    data: teams,
    isLoading: teamsLoading,
    refetch,
  } = useQuery({
    queryKey: ["teams", opportunityId],
    queryFn: () => getTeams({ opportunity_id: opportunityId }),
    enabled: Boolean(authToken),
  });

  const columns = [
    {
      label: t("COMMON.TEAM"),
      key: selectedLanguage === "ar" ? "team_name_ar" : "team_name_en",
    },
    { label: t("COMMON.ACTION"), key: "Action" },
  ];

  if (teamsLoading) {
    return <Loader />;
  }

  return (
    <>
      <div className="pb-10">
        <Table
          columns={columns}
          data={teams?.data ?? []}
          renderCell={(column, rowData) => {
            if (column.key === "Action") {
              return (
                <div className="flex items-center gap-4 mobilescreen:gap-2">
                  <button
                    type="button"
                    className="text-primary-5 cursor-pointer"
                    onClick={() => {
                      setEditTeamId(rowData.id);
                      setOpenForm(true);
                    }}
                  >
                    <FiEdit size={windowWidth <= 767 ? 18 : 24} />
                  </button>
                  <button
                    type="button"
                    className="text-primary-5 cursor-pointer"
                    onClick={() => {
                      setDeleteTeamId(rowData.id);
                      setOpenDeleteModal(true);
                    }}
                  >
                    <RiDeleteBin5Fill size={windowWidth <= 767 ? 18 : 24} />
                  </button>
                </div>
              );
            }
            return <span>{rowData[column.key] ?? "-"}</span>;
          }}
        />
      </div>

      <div className="flex xss:flex-col justify-center w-full gap-5">
        <Button
          variant="primary"
          size="medium"
          className="xss:!w-full"
          onClick={() => {
            setOpenForm(true);
            setEditTeamId(null);
          }}
        >
          {t("COMMON.CREATE.TEAM")}
        </Button>
      </div>

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={t(editTeamId ? "COMMON.EDIT.TEAM" : "COMMON.CREATE.TEAM")}
        size="small"
      >
        <CreateTeam
          setOpenForm={() => setOpenForm(false)}
          opportunityId={opportunityId}
          refetch={refetch}
          teamId={editTeamId ?? ""}
          dropdownRefetch={dropdownRefetch}
        />
      </Modal>

      <Modal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        title={t("COMMON.DELETE_CONFIRMATION_TEAM")}
        size="small"
      >
        <DeleteTeam
          setOpenDeleteModal={() => setOpenDeleteModal(false)}
          refetch={refetch}
          teamId={deleteTeamId ?? ""}
          dropdownRefetch={dropdownRefetch}
          teamName={teams?.data?.find(
            (team: { id: string }) => team.id === deleteTeamId
          )}
        />
      </Modal>
    </>
  );
}
