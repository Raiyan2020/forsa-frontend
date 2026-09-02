"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FaPlus } from "react-icons/fa6";
import { RiDeleteBin5Fill } from "react-icons/ri";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Searchbar from "@/components/ui/Searchbar";
import Table, { TableColumn } from "@/components/ui/Table";
import InlineSpinner from "@/components/ui/InlineSpinner";
import Loader from "@/components/ui/Loader";
import { SponsorsClient } from "@/features/home";
import { bulkUpdateScanPermissions, downloadScanPermissions, getAllVolunteers, getScanPermissionsList } from "@/features/opportunities/services/attendance";
import { getApiErrorMessages, isApiSuccess } from "@/lib/api/errors";
import { getDefaultProfileImage } from "@/lib/helpers";
import { NAV_STATE_KEYS, getNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/${path}`;

export interface ScanPermissionState {
  id?: string | number;
  opportunity_status?: string;
  event_id?: string | number;
}

export default function ScanPermission() {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();
  const router = useRouter();

  // Carried over from the opportunity / event row that linked here.
  const [navState, setNavStateValue] = useState<ScanPermissionState>({});
  useEffect(() => {
    setNavStateValue(
      getNavState<ScanPermissionState>(NAV_STATE_KEYS.scanPermission) ?? {}
    );
  }, []);
  const opportunityId = navState.id;
  const opportunity_status = navState.opportunity_status;
  const eventId = navState.event_id;

  const [page] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchVolunteerTerm, setSearchVolunteerTerm] = useState("");
  const [showVolunteersModal, setShowVolunteersModal] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedVolunteers, setSelectedVolunteers] = useState<number[]>([]);
  const [registeringVolunteers, setRegisteringVolunteers] = useState(false);
  const [volunteerPage, setVolunteerPage] = useState(1);
  const [allVolunteers, setAllVolunteers] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingVolunteerId, setDeletingVolunteerId] = useState<number | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  const downloadMutation = useMutation({ mutationFn: downloadScanPermissions });
  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdateScanPermissions,
  });

  // Validate that we have either opportunityId or eventId, but not both
  useEffect(() => {
    if (opportunityId && eventId) {
      console.warn(
        "Both opportunityId and eventId are provided. Using opportunityId by default."
      );
    }
  }, [opportunityId, eventId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchVolunteerTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchVolunteerTerm]);

  const {
    data: registrations,
    isLoading,
    refetch: refetchRegistrations,
  } = useQuery({
    queryKey: [
      "scan-permissions",
      opportunityId,
      eventId,
      page,
      debouncedSearch,
    ],
    queryFn: () =>
      getScanPermissionsList({
        opportunity_id: opportunityId,
        event_id: eventId,
        page,
        limit: 10,
        search: debouncedSearch,
      }),
    enabled: Boolean(opportunityId || eventId),
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columns: TableColumn[] = [
    { label: t("COMMON.VOLUNTEER.NAME"), key: "full_name", type: "custom" },
    { label: t("COMMON.EMAIL"), key: "email" },
    { label: t("COMMON.CONTACT_NUMBER"), key: "phone_number" },
    { label: t("COMMON.ACTION"), key: "actions", type: "actions" },
  ];

  const handleDownload = async () => {
    if (!opportunityId && !eventId) return;
    try {
      const response = await downloadMutation.mutateAsync({
        opportunity_id: opportunityId,
        event_id: eventId,
        search: debouncedSearch,
        download: true,
      });
      if (response?.data?.downloadUrl) {
        const link = document.createElement("a");
        link.href = response.data.downloadUrl;
        link.download = "List of Registered Volunteers.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success(t("COMMON.DOWNLOAD_SUCCESS"));
    } catch {
      toast.error(t("COMMON.DOWNLOAD_FAILURE"));
    }
  };

  const handleAddVolunteerClick = () => {
    // Set up the state for a fresh search, then open the modal — the query below
    // is keyed on these values so it refetches on its own.
    setSearchVolunteerTerm("");
    setDebouncedSearchTerm("");
    setSelectedVolunteers([]);
    setVolunteerPage(1);
    setAllVolunteers([]);
    setShowVolunteersModal(true);
  };

  // Reset to page 1 when the search term changes. Keep the accumulated list on
  // screen until the new results arrive — the small spinner next to the search
  // icon signals the in-flight request, so the list never flashes empty.
  useEffect(() => {
    if (showVolunteersModal) {
      setVolunteerPage(1);
    }
  }, [debouncedSearchTerm, showVolunteersModal]);

  // Query for available volunteers when the modal is open
  const {
    data: availableVolunteers,
    isFetching: fetchingVolunteers,
  } = useQuery({
    queryKey: [
      "all-volunteers",
      volunteerPage,
      debouncedSearchTerm,
      opportunityId,
      eventId,
    ],
    queryFn: () =>
      getAllVolunteers({
        page: volunteerPage,
        search: debouncedSearchTerm,
        opportunity_id: opportunityId, // Filter volunteers by opportunity
        event_id: eventId, // Filter volunteers by event
      }),
    // Only fetch when modal is open and we have either ID
    enabled: showVolunteersModal && Boolean(opportunityId || eventId),
  });

  // Handling data based on pagination
  useEffect(() => {
    if (showVolunteersModal && availableVolunteers?.data) {
      if (volunteerPage === 1) {
        setAllVolunteers(availableVolunteers.data);
      } else {
        setAllVolunteers((prevVolunteers) => {
          const newVolunteers = availableVolunteers.data.filter(
            (volunteer: any) =>
              !prevVolunteers.some((v) => v.id === volunteer.id)
          );
          return [...prevVolunteers, ...newVolunteers];
        });
      }
    }
  }, [availableVolunteers?.data, volunteerPage, showVolunteersModal]);

  const toggleVolunteerSelection = (
    volunteerId: number,
    event?: React.MouseEvent
  ) => {
    // If the event comes from the checkbox itself, prevent double toggling
    if (event) {
      event.stopPropagation();
    }
    setSelectedVolunteers((prev) => {
      const numericId = Number(volunteerId);
      return prev.includes(numericId)
        ? prev.filter((id) => id !== numericId)
        : [...prev, numericId];
    });
  };

  // Surfaces the API's localized validation messages (response_status.validation_errors,
  // falling back to msg) as toasts — the bulk-update endpoint rejects with a
  // `permissions` validation error today. Messages arrive already localized by
  // the backend from the language header, so there is nothing to pick per
  // language here; the translated fallback only covers "API said nothing".
  const showBulkUpdateErrors = (error: unknown, fallback: string) => {
    const messages = getApiErrorMessages(error, selectedLanguage);
    if (messages.length > 0) {
      messages.forEach((message) => toast.error(message));
    } else {
      toast.error(fallback);
    }
  };

  const handleRegisterSelectedVolunteers = async () => {
    if ((!opportunityId && !eventId) || selectedVolunteers.length === 0) return;

    try {
      setRegisteringVolunteers(true);

      const response = await bulkUpdateMutation.mutateAsync({
        opportunity_id: opportunityId,
        event_id: eventId,
        user_ids: selectedVolunteers,
        is_allowed: true,
      });

      // The API can answer a rejected request with HTTP 200 and key: "fail" —
      // check the envelope, not just the axios error path below.
      if (!isApiSuccess(response)) {
        showBulkUpdateErrors(response, t("COMMON.PERMISSION_ADDED_FAILED"));
        return;
      }

      toast.success(t("COMMON.PERMISSION_ADDED_SUCCESS"));
      setShowVolunteersModal(false);
      // `data[]` echoes the persisted `is_allowed` per user (trust it over what
      // was sent) — the refetch is what the table renders, so the UI always
      // shows server truth.
      refetchRegistrations();
    } catch (error) {
      console.error("Error updating scan permissions:", error);
      showBulkUpdateErrors(error, t("COMMON.PERMISSION_ADDED_FAILED"));
    } finally {
      setRegisteringVolunteers(false);
    }
  };

  // Only show data when modal is open
  const displayedVolunteers = showVolunteersModal ? allVolunteers : [];

  // Handler for removing a volunteer's scan permission
  const handleDeleteVolunteer = async () => {
    if ((!opportunityId && !eventId) || !deletingVolunteerId) return;

    try {
      setIsDeleting(true);

      const response = await bulkUpdateMutation.mutateAsync({
        opportunity_id: opportunityId,
        event_id: eventId,
        user_ids: [deletingVolunteerId],
        is_allowed: false,
      });

      // Same envelope check: an HTTP 200 with key: "fail" is still a failure.
      if (!isApiSuccess(response)) {
        showBulkUpdateErrors(response, t("COMMON.SCAN_PERMISSION_FAILED"));
        return;
      }

      toast.success(t("COMMON.SCAN_PERMISSION_REMOVED"));
      setShowDeleteModal(false);
      // Revoked rows persist with `is_allowed: false` and the list endpoint
      // only returns allowed rows, so they drop out — refetch to refresh.
      refetchRegistrations();
    } catch (error) {
      showBulkUpdateErrors(error, t("COMMON.SCAN_PERMISSION_FAILED"));
    } finally {
      setIsDeleting(false);
      setDeletingVolunteerId(null);
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (volunteerId: number) => {
    setDeletingVolunteerId(volunteerId);
    setShowDeleteModal(true);
  };

  const goToProfile = (user: any, fallbackId?: string | number) => {
    const id = user?.id || fallbackId;
    if (!id) return;
    router.push(
      user?.is_public
        ? `/public-profile/${id}`
        : `/volunteer-private-profile/${id}`
    );
  };

  return (
    <>
      {isLoading && <Loader />}

      {/* Modal for Available Volunteers */}
      <Modal
        open={showVolunteersModal}
        onClose={() => setShowVolunteersModal(false)}
        title={t("COMMON.ADD_PERMISSION")}
        size="md"
        footer={
          <div className="flex justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              disabled={
                selectedVolunteers.length === 0 || registeringVolunteers
              }
              onClick={handleRegisterSelectedVolunteers}
            >
              {t("COMMON.ADD")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              onClick={() => setShowVolunteersModal(false)}
              disabled={registeringVolunteers}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <div className="pb-10">
          {/* Search input */}
          <div className="mb-4 flex items-center searchitms bg-white border border-primary-5/20 rounded-full px-4 py-2">
            {/* Small spinner next to the search icon while a search is in flight */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Image
                src={asset("profile/searchicn.svg")}
                alt="Search Icon"
                width={24}
                height={24}
                className="lg:w-auto md:w-5"
              />
              {fetchingVolunteers && <InlineSpinner />}
            </div>
            <input
              type="text"
              placeholder={t("COMMON.SEARCH_VOLUNTEERS")}
              className="flex-1 outline-none bg-transparent px-2 2xl:text-[25px] lg:text-lg xss:text-base laptopmain:text-xl lg:w-auto md:w-[150px] w-[150px] placeholder:text-[#181822]/80"
              onChange={(e) => setSearchVolunteerTerm(e.target.value)}
            />
          </div>

          {/* Selected count */}
          {selectedVolunteers.length > 0 && (
            <div className="mb-4 text-primary-5 font-medium">
              {t("COMMON.SELECTED_VOLUNTEERS")}: {selectedVolunteers.length}
            </div>
          )}

          {/* Volunteers list */}
          <div className="max-h-96 overflow-y-auto">
            {displayedVolunteers.length === 0 && fetchingVolunteers ? (
              <Loader inline />
            ) : displayedVolunteers.length === 0 ? (
              <div className="text-center text-gray-500 p-4">
                {t("COMMON.NO_VOLUNTEERS_FOUND")}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedVolunteers.map((volunteer: any) => {
                  // The payload uses one of several id shapes depending on endpoint.
                  const volunteerId = Number(
                    volunteer.user_id ?? volunteer.user?.id ?? volunteer.id
                  );
                  const isSelected = selectedVolunteers.includes(volunteerId);

                  const defaultImage = getDefaultProfileImage(
                    volunteer?.user?.gender_display?.value_en,
                    asset("profile/male_profile.svg"),
                    asset("profile/female_profile.svg"),
                    asset("profile/org_profile.svg")
                  );

                  return (
                    <div
                      key={volunteerId}
                      className={`border rounded-md p-3 flex items-center gap-3 ${
                        isSelected ? "bg-primary-5/10 border-primary-5" : ""
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <Image
                          src={volunteer.user?.profile_pic || defaultImage}
                          alt={volunteer?.user?.full_name}
                          width={48}
                          height={48}
                          unoptimized
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium">
                          <span
                            className="cursor-pointer text-primary-5"
                            onClick={() =>
                              goToProfile(
                                volunteer.user,
                                volunteer.user_id || volunteer.id
                              )
                            }
                          >
                            {volunteer?.user?.full_name}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 p-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleVolunteerSelection(volunteerId)}
                          className="h-5 w-5 text-primary-5 rounded focus:ring-primary-5 cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title={t("COMMON.REMOVE_PERMISSION")}
        size="sm"
        footer={
          <div className="flex justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              disabled={isDeleting}
              onClick={handleDeleteVolunteer}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <div className="pb-10 text-center text-lg">
          <p>{t("COMMON.REMOVE_PERMISSION_DESCRIPTION")}</p>
        </div>
      </Modal>

      <div className="border-t border-[#000]">
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px] mx-auto relative">
          <div className="flex justify-between items-center mobilescreen:flex-col mobilescreen:gap-4">
            <h2 className="2xl:text-[40px] lg:text-[32px] md:text-[30px] text-[24px] text-primary-5 font-bold">
              {t("COMMON.SCAN_PERMISSION")}
            </h2>
          </div>
          <div className="mobilescreen:w-[100%] flex justify-center pt-12 pb-12">
            <Searchbar
              onSearchChange={(value) => setSearchQuery(value)}
              showFilterIcon={false}
            />
          </div>
          <div className="selectfiled voulnteerlist relative">
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              <Table
                columns={columns}
                data={registrations?.data ?? []}
                renderCell={(column, rowData: any) => {
                  if (column.type === "custom" && column.key === "full_name") {
                    const defaultImage = getDefaultProfileImage(
                      rowData?.user?.gender_display?.value_en,
                      asset("profile/male_profile.svg"),
                      asset("profile/female_profile.svg"),
                      asset("profile/org_profile.svg")
                    );
                    return (
                      <div className="flex items-center gap-3 pr-5">
                        <Image
                          src={rowData?.profile_pic || defaultImage}
                          alt={rowData.full_name}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span
                          className="cursor-pointer text-primary-5"
                          onClick={() =>
                            goToProfile(
                              rowData.user,
                              rowData.user_id || rowData.id
                            )
                          }
                        >
                          {rowData.full_name}
                        </span>
                      </div>
                    );
                  }
                  if (column.type === "actions") {
                    const userId = Number(rowData.id || rowData.user_id);
                    return (
                      <div
                        className={`flex ${
                          selectedLanguage === "ar"
                            ? "mr-[10px] mobilescreen:mr-[5px]"
                            : "ml-[18px] mobilescreen:ml-[14px]"
                        }`}
                      >
                        <button
                          onClick={() => openDeleteModal(userId)}
                          className="text-primary-5 cursor-pointer"
                          title={t("COMMON.REMOVE_PERMISSION")}
                        >
                          <RiDeleteBin5Fill
                            size={windowWidth <= 767 ? 18 : 24}
                          />
                        </button>
                      </div>
                    );
                  }
                  return <span>{rowData[column.key] || "-"}</span>;
                }}
              />
            </div>

            {/* Plus icon button to add volunteers */}
            {opportunity_status !== "completed" && (
              <div className="flex justify-center mt-4">
                <button
                  className="p-2 text-primary-5 hover:text-primary-5/80 transition-colors"
                  onClick={handleAddVolunteerClick}
                  title={t("COMMON.ADD_PERMISSION")}
                >
                  <FaPlus size={24} />
                </button>
              </div>
            )}
          </div>
          <div className="flex justify-center mx-auto py-12 mobilescreen:py-8">
            <Button
              variant="primary"
              size="medium"
              className="!w-[255px] !h-[60px]"
              onClick={handleDownload}
              disabled={registrations?.data?.length === 0}
            >
              <Image
                src={asset("voluneteerevent/downloadsheet.svg")}
                alt=""
                width={20}
                height={20}
              />{" "}
              {t("COMMON.DOWNLOAD_SHEET")}
            </Button>
          </div>
        </div>
        <div className="border-t border-[#000]/20 pt-12">
          <SponsorsClient />
        </div>
      </div>
    </>
  );
}
