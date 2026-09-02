"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import InfiniteScroll from "react-infinite-scroll-component";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { directRegisterVolunteer } from "@/features/opportunities/services/registrations";
import { getAvailableVolunteers } from "@/features/shared/services/directory";
import { getDefaultProfileImage } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";
import { goToProfile } from "./volunteerListHelpers";

interface AddVolunteersModalProps {
  open: boolean;
  onClose: () => void;
  opportunityId: string | undefined;
  /** Called after volunteers are successfully registered, so the caller can refresh its list. */
  onRegistered: () => void | Promise<void>;
}

/**
 * Search-and-select modal for directly registering existing volunteers to an
 * opportunity. Fully self-contained: owns its own search, pagination and
 * selection state, only reporting back on success.
 */
export default function AddVolunteersModal({
  open,
  onClose,
  opportunityId,
  onRegistered,
}: AddVolunteersModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const [searchVolunteerTerm, setSearchVolunteerTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedVolunteers, setSelectedVolunteers] = useState<number[]>([]);
  const [volunteerPage, setVolunteerPage] = useState(1);
  const [allVolunteers, setAllVolunteers] = useState<any[]>([]);
  const [hasMoreVolunteers, setHasMoreVolunteers] = useState(true);

  const registerVolunteersMutation = useMutation({
    mutationFn: directRegisterVolunteer,
  });

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearchTerm(searchVolunteerTerm),
      500
    );
    return () => clearTimeout(timer);
  }, [searchVolunteerTerm]);

  // Fresh start every time the modal opens, mirroring the original's
  // click-time reset — adjusted during render (React's documented pattern
  // for resetting state on a prop change) rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSearchVolunteerTerm("");
      setDebouncedSearchTerm("");
      setSelectedVolunteers([]);
      setVolunteerPage(1);
      setAllVolunteers([]);
      setHasMoreVolunteers(true);
    }
  }

  // A search while the modal stays open restarts pagination.
  useEffect(() => {
    if (!open) return;
    setVolunteerPage(1);
    setAllVolunteers([]);
    setHasMoreVolunteers(true);
  }, [debouncedSearchTerm, open]);

  const availableVolunteersQuery = useQuery({
    queryKey: [
      "available-volunteers",
      opportunityId,
      debouncedSearchTerm,
      volunteerPage,
    ],
    queryFn: () =>
      getAvailableVolunteers({
        opportunity_id: opportunityId || "0",
        type: "volunteer",
        search: debouncedSearchTerm,
        page: volunteerPage,
        limit: 5,
      }),
    enabled: Boolean(opportunityId) && open,
  });

  const availableVolunteers = availableVolunteersQuery.data;
  const fetchingVolunteers = availableVolunteersQuery.isFetching;

  useEffect(() => {
    if (!availableVolunteers || fetchingVolunteers) return;

    if (volunteerPage === 1) {
      setAllVolunteers(availableVolunteers.data || []);
    } else {
      setAllVolunteers((previous) => [
        ...previous,
        ...(availableVolunteers.data || []),
      ]);
    }

    const pagination = availableVolunteers?.meta?.pagination;
    if (pagination) {
      const currentPage = pagination.page || pagination.current_page;
      setHasMoreVolunteers(currentPage < pagination.total_pages);
    } else {
      setHasMoreVolunteers((availableVolunteers.data || []).length >= 5);
    }
  }, [availableVolunteers, fetchingVolunteers, volunteerPage]);

  const loadMoreVolunteers = () => {
    if (hasMoreVolunteers && !fetchingVolunteers) {
      setVolunteerPage((previous) => previous + 1);
    }
  };

  const toggleVolunteerSelection = (volunteerId: number) => {
    setSelectedVolunteers((previous) => {
      const numericId = Number(volunteerId);
      return previous.includes(numericId)
        ? previous.filter((id) => id !== numericId)
        : [...previous, numericId];
    });
  };

  const handleRegisterSelectedVolunteers = async () => {
    if (!opportunityId || selectedVolunteers.length === 0) return;

    try {
      await registerVolunteersMutation.mutateAsync({
        opportunity_id: opportunityId,
        user_ids: selectedVolunteers,
      });
      toast.success(t("COMMON.VOLUNTEERS_ADDED_SUCCESS"));
      onClose();
      await onRegistered();
    } catch (error: any) {
      const data = error?.response?.data;
      toast.error(
        data?.[`message_${selectedLanguage}`] ||
          t("COMMON.VOLUNTEERS_ADDED_FAILED")
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("COMMON.AVAILABLE_VOLUNTEERS")}
      size="md"
      footer={
        <div className="flex xss:flex-col justify-center w-full gap-5">
          <Button
            variant="primary"
            size="medium"
            className="xss:!w-full"
            disabled={
              selectedVolunteers.length === 0 ||
              registerVolunteersMutation.isPending
            }
            onClick={handleRegisterSelectedVolunteers}
          >
            {t("COMMON.ADD")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            className="xss:!w-full"
            onClick={onClose}
            disabled={registerVolunteersMutation.isPending}
          >
            {t("COMMON.CANCEL")}
          </Button>
        </div>
      }
    >
      <div className="pb-10">
        <div className="mb-4 flex items-center searchitms bg-white border border-primary-5/20 rounded-full px-4 py-2">
          <img
            src="/assets/profile/searchicn.svg"
            alt=""
            className="lg:w-auto md:w-5"
          />
          <input
            type="text"
            placeholder={t("COMMON.SEARCH_VOLUNTEERS")}
            className="flex-1 outline-none bg-transparent px-2 2xl:text-[25px] lg:text-lg xss:text-base laptopmain:text-xl lg:w-auto md:w-[150px] w-[150px] placeholder:text-[#181822CC]/80"
            onChange={(event) => setSearchVolunteerTerm(event.target.value)}
          />
        </div>

        {selectedVolunteers.length > 0 && (
          <div className="mb-4 text-primary-5 font-medium">
            {t("COMMON.SELECTED_VOLUNTEERS")}: {selectedVolunteers.length}
          </div>
        )}

        {availableVolunteersQuery.isLoading && volunteerPage === 1 ? (
          <div className="max-h-96 overflow-y-auto">
            <Loader />
          </div>
        ) : allVolunteers.length === 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <div className="text-center text-gray-500 p-4">
              {t("COMMON.NO_VOLUNTEERS_FOUND")}
            </div>
          </div>
        ) : (
          <div
            id="volunteers-scroll-container"
            className="max-h-96 overflow-y-auto"
          >
            <InfiniteScroll
              dataLength={allVolunteers.length}
              next={loadMoreVolunteers}
              hasMore={hasMoreVolunteers}
              hasChildren={allVolunteers.length > 0}
              loader={
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-5" />
                </div>
              }
              endMessage={
                <div className="text-center text-gray-500 py-4 text-sm">
                  {t("COMMON.NO_MORE_VOLUNTEERS")}
                </div>
              }
              scrollableTarget="volunteers-scroll-container"
            >
              <div className="space-y-2">
                {allVolunteers.map((volunteer: any) => {
                  const volunteerId = Number(
                    volunteer.user_id || volunteer.user?.id || volunteer.id
                  );
                  const isSelected = selectedVolunteers.includes(volunteerId);

                  return (
                    <div
                      key={volunteerId}
                      className={`border rounded-md p-3 flex items-center gap-3 ${
                        isSelected ? "bg-primary-5/10 border-primary-5" : ""
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <img
                          src={
                            volunteer.user?.profile_pic ||
                            getDefaultProfileImage(
                              volunteer?.user?.gender_display?.value_en,
                              "/assets/profile/male_profile.svg",
                              "/assets/profile/female_profile.svg",
                              "/assets/profile/org_profile.svg"
                            )
                          }
                          alt={volunteer.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium">
                          <span
                            className="cursor-pointer text-primary-5"
                            onClick={() =>
                              goToProfile(
                                router,
                                volunteer.user,
                                volunteer.user_id || volunteer.id
                              )
                            }
                          >
                            {volunteer.full_name}
                          </span>
                        </div>
                        {(volunteer.civil_id || volunteer.user?.civil_id) && (
                          <div className="text-xs text-gray-500">
                            {volunteer.civil_id || volunteer.user?.civil_id}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          {volunteer.email}
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
            </InfiniteScroll>
          </div>
        )}
      </div>
    </Modal>
  );
}
