"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RiDeleteBin5Fill } from "react-icons/ri";

import { Button } from "@/components/ui/Button";
import InlineSpinner from "@/components/ui/InlineSpinner";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import {
  bulkUpdateAttendancePermissions,
  getAllVolunteers,
  getAttendancePermissionsList,
} from "@/features/opportunities/services/attendance";
import { getApiErrorMessages } from "@/lib/api/errors";
import { getDefaultProfileImage } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/${path}`;

interface AttendancePermissionModalProps {
  onClose: () => void;
  opportunityId: string | undefined;
}

/** The shape both endpoints hand back for a person, flattened by `person()`. */
interface PermissionRow {
  id?: number | string;
  user_id?: number | string;
  user?: {
    id?: number | string;
    full_name?: string;
    profile_pic?: string | null;
    gender_display?: { value_en?: string | null } | null;
  } | null;
  full_name?: string;
  email?: string;
  phone_number?: string;
  civil_id?: string | null;
  passport_number?: string | null;
  profile_pic?: string | null;
  gender_display?: { value_en?: string | null } | null;
  attendance_permission_id?: number;
}

/**
 * «إذن تحضير» — grant and revoke the BE-69 permission for one opportunity.
 *
 * **Not** the `/scan-permission` screen. That one delegates QR scanning and is
 * retiring with BE-61 Part C; this grants a volunteer the ability to add other
 * volunteers to the opportunity and record their hours, which is a different
 * job on a different table. The client spelled the distinction out: «وليس
 * التحضير باستخدام الـ QR».
 *
 * One modal with two panels rather than a second route, because granting is
 * something an organizer does *while* looking at the volunteer list — the
 * screen the client's mockup puts the button on.
 *
 * Revoking is the same bulk-update call with `is_allowed: false`; the API has
 * no delete route, and the row is kept so the grant history survives.
 *
 * Mounted by the caller only while it is open, so every `useState` below starts
 * fresh on each open — reopening always lands on the holders list rather than
 * on a half-filled picker, without an effect that resets state on a prop flip.
 */
export default function AttendancePermissionModal({
  onClose,
  opportunityId,
}: AttendancePermissionModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [revoking, setRevoking] = useState<number | null>(null);

  const bulkUpdate = useMutation({
    mutationFn: bulkUpdateAttendancePermissions,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: holdersData,
    isFetching: loadingHolders,
    refetch: refetchHolders,
  } = useQuery({
    queryKey: ["attendance-permissions", opportunityId],
    queryFn: () =>
      getAttendancePermissionsList({
        opportunity_id: opportunityId as string,
        limit: 100,
      }),
    enabled: Boolean(opportunityId),
  });

  const holders: PermissionRow[] = useMemo(
    () => holdersData?.data ?? [],
    [holdersData?.data]
  );

  const { data: candidatesData, isFetching: loadingCandidates } = useQuery({
    queryKey: ["all-volunteers", "attendance-permission", opportunityId, debouncedSearch],
    queryFn: () =>
      getAllVolunteers({
        opportunity_id: opportunityId,
        search: debouncedSearch,
        limit: 50,
      }),
    enabled: picking && Boolean(opportunityId),
  });

  /** The two endpoints disagree on where the person sits; read both shapes. */
  const person = (row: PermissionRow) => ({
    id: Number(row.user_id ?? row.user?.id ?? row.id),
    name: row.full_name || row.user?.full_name || "",
    email: row.email || "",
    phone: row.phone_number || "",
    identifiers: [row.civil_id, row.passport_number, row.phone_number].filter(
      (value): value is string => Boolean(value)
    ),
    pic: row.profile_pic || row.user?.profile_pic || "",
    genderEn:
      row.gender_display?.value_en || row.user?.gender_display?.value_en || "",
  });

  const holderIds = useMemo(
    () => new Set(holders.map((row) => person(row).id)),
    [holders]
  );

  const candidates: PermissionRow[] = useMemo(
    // Someone who already holds it is not a candidate — offering them again
    // would look like a second grant and do nothing.
    () =>
      (candidatesData?.data ?? []).filter(
        (row: PermissionRow) => !holderIds.has(person(row).id)
      ),
    [candidatesData?.data, holderIds]
  );

  const reportError = (error: unknown) => {
    const messages = getApiErrorMessages(error, selectedLanguage);
    if (messages.length > 0) {
      messages.forEach((message) => toast.error(message));
    } else {
      toast.error(t("COMMON.UPDATE_FAILED"));
    }
  };

  const grant = async () => {
    if (!opportunityId || selected.length === 0) return;
    try {
      await bulkUpdate.mutateAsync({
        opportunity_id: opportunityId,
        user_ids: selected,
        is_allowed: true,
      });
      toast.success(t("COMMON.UPDATE_SUCCESS"));
      setSelected([]);
      setPicking(false);
      await refetchHolders();
    } catch (error) {
      reportError(error);
    }
  };

  const revoke = async (userId: number) => {
    if (!opportunityId) return;
    try {
      setRevoking(userId);
      await bulkUpdate.mutateAsync({
        opportunity_id: opportunityId,
        user_ids: [userId],
        is_allowed: false,
      });
      toast.success(t("COMMON.UPDATE_SUCCESS"));
      await refetchHolders();
    } catch (error) {
      reportError(error);
    } finally {
      setRevoking(null);
    }
  };

  const avatar = (row: ReturnType<typeof person>) =>
    row.pic ||
    getDefaultProfileImage(
      row.genderEn,
      asset("profile/male_profile.svg"),
      asset("profile/female_profile.svg"),
      asset("profile/org_profile.svg")
    );

  return (
    <Modal
      open
      onClose={onClose}
      title={t("COMMON.ATTENDANCE_PERMISSION")}
      size="md"
      footer={
        <div className="flex w-full justify-center gap-5">
          {picking ? (
            <>
              <Button
                variant="primary"
                size="medium"
                disabled={selected.length === 0 || bulkUpdate.isPending}
                onClick={grant}
              >
                {t("COMMON.ADD")}
              </Button>
              <Button
                variant="secondary"
                size="medium"
                disabled={bulkUpdate.isPending}
                onClick={() => {
                  setSelected([]);
                  setPicking(false);
                }}
              >
                {t("COMMON.CANCEL")}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="medium"
              onClick={() => setPicking(true)}
            >
              {t("COMMON.ADD_PERMISSION")}
            </Button>
          )}
        </div>
      }
    >
      <p className="mb-4 text-center text-sm text-[#181822CC]/70">
        {t("COMMON.ATTENDANCE_PERMISSION_HINT")}
      </p>

      {picking ? (
        <div className="pb-4">
          <div className="searchitms mb-4 flex items-center rounded-full border border-primary-5/20 bg-white px-4 py-2">
            <div className="flex flex-shrink-0 items-center gap-2">
              <Image
                src={asset("profile/searchicn.svg")}
                alt=""
                width={24}
                height={24}
                className="md:w-5 lg:w-auto"
              />
              {loadingCandidates && <InlineSpinner />}
            </div>
            <input
              type="text"
              value={search}
              placeholder={t("COMMON.SEARCH_VOLUNTEERS_BY_IDENTITY")}
              className="flex-1 bg-transparent px-2 text-base outline-none placeholder:text-[#181822]/80"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {selected.length > 0 && (
            <div className="mb-4 font-medium text-primary-5">
              {t("COMMON.SELECTED_VOLUNTEERS")}: {selected.length}
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {candidates.length === 0 && loadingCandidates ? (
              <Loader inline />
            ) : candidates.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {t("COMMON.NO_VOLUNTEERS_FOUND")}
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((row) => {
                  const it = person(row);
                  const isSelected = selected.includes(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() =>
                        setSelected((previous) =>
                          previous.includes(it.id)
                            ? previous.filter((id) => id !== it.id)
                            : [...previous, it.id]
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-md border p-3 text-start ${
                        isSelected ? "border-primary-5 bg-primary-5/10" : ""
                      }`}
                    >
                      <Image
                        src={avatar(it)}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                      />
                      <span className="flex-grow">
                        <span className="block font-medium">{it.name}</span>
                        {/* Whichever identifier the organizer searched by. */}
                        {it.identifiers.length > 0 && (
                          <span className="block text-xs text-gray-500" dir="ltr">
                            {it.identifiers.join(" · ")}
                          </span>
                        )}
                        {it.email && (
                          <span className="block text-sm text-gray-500">
                            {it.email}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto pb-4">
          {holders.length === 0 && loadingHolders ? (
            <Loader inline />
          ) : holders.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {t("COMMON.NO_PERMISSIONS_YET")}
            </div>
          ) : (
            <div className="space-y-2">
              {holders.map((row) => {
                const it = person(row);
                return (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <Image
                      src={avatar(it)}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                    />
                    <div className="flex-grow">
                      <div className="font-medium">{it.name}</div>
                      {(it.email || it.phone) && (
                        <div className="text-sm text-gray-500">
                          {it.email || it.phone}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => revoke(it.id)}
                      disabled={revoking === it.id}
                      className="text-[#D32F2F] disabled:opacity-50"
                      title={t("COMMON.DELETE")}
                      aria-label={t("COMMON.DELETE")}
                    >
                      <RiDeleteBin5Fill size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
