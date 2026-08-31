"use client";

import React, { SetStateAction, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin5Fill } from "react-icons/ri";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTimeSlotsStore } from "@/store/timeSlotsStore";
import EventCreateTimingModal from "./EventCreateTimingModal";

export interface TimeSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  participants_needed: number;
  event_start_date?: string;
  event_end_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  isSaved: boolean;
}

interface EventTimeSlotModalProps {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  participantsNeeded: number;
  setOpen: React.Dispatch<SetStateAction<boolean>>;
  disableSaveButton: boolean;
}

const formatTime = (timeString: string | null): string => {
  if (!timeString) return "N/A";
  return timeString.slice(0, 5); // "HH:mm"
};

export default function EventTimeSlotModal({
  startDate,
  endDate,
  startTime,
  endTime,
  participantsNeeded,
  setOpen,
  disableSaveButton,
}: EventTimeSlotModalProps) {
  const { t } = useTranslation();
  const [opentime, setOpentime] = useState(false);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "clear" | null>(
    null
  );
  const [slotIdToDelete, setSlotIdToDelete] = useState<number | null>(null);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Draft slots live in the shared store until the parent form is submitted
  const timeSlots = useTimeSlotsStore((s) => s.timeSlots);
  const deleteTimeSlot = useTimeSlotsStore((s) => s.deleteTimeSlot);
  const clearTimeSlots = useTimeSlotsStore((s) => s.clearTimeSlots);
  const updateTimeSlot = useTimeSlotsStore((s) => s.updateTimeSlot);

  // Use props directly for event details
  const oppStartDate = startDate || "";
  const oppEndDate = endDate || "";
  const oppStartTime = startTime || "";
  const oppEndTime = endTime || "";

  const handleTimeSlotCreated = () => {
    setOpentime(false);
    setEditingTimeSlot(null);
  };

  const handleEditClick = (slotId: number) => {
    const slot = timeSlots.find((s) => s.id === slotId);
    if (slot) {
      setEditingTimeSlot(slot);
      setOpentime(true);
    }
  };

  const handleDeleteClick = (slotId: number) => {
    setSlotIdToDelete(slotId);
    setConfirmAction("delete");
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    try {
      if (confirmAction === "delete" && slotIdToDelete !== null) {
        deleteTimeSlot(slotIdToDelete);
        toast.success(t("COMMON.TOAST.DELETE_TIME_SLOT_SUCCESS"));
      } else if (confirmAction === "clear") {
        clearTimeSlots();
        toast.success(t("COMMON.TOAST.CLEAR_TIME_SLOTS_SUCCESS"));
      }
    } catch (error) {
      console.error("Error performing action:", error);
      toast.error(
        confirmAction === "delete"
          ? t("COMMON.TOAST.DELETE_TIME_SLOT_FAILED")
          : t("COMMON.TOAST.CLEAR_TIME_SLOTS_FAILED")
      );
    } finally {
      setShowConfirmModal(false);
      setConfirmAction(null);
      setSlotIdToDelete(null);
    }
  };

  const groupedTimeSlots = useMemo(() => {
    if (!timeSlots.length) return {};

    return timeSlots.reduce((acc: any, slot: TimeSlot) => {
      const date = new Date(slot.date).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push({
        id: slot.id,
        time: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
        needed: slot.participants_needed,
        rawSlot: slot,
      });
      return acc;
    }, {});
  }, [timeSlots]);

  const isLoading = !oppStartDate || !oppEndDate;

  const handleSaveTimeSlots = () => {
    timeSlots.forEach((slot) => updateTimeSlot({ ...slot, isSaved: true }));
    setOpen(false);
    toast.success(t("COMMON.TOAST.CREATE_TIME_SLOT_SUCCESS"));
  };

  if (isLoading) {
    return <div>{t("COMMON.LOADING")}</div>;
  }

  const noTimeSlots = timeSlots.length === 0;

  return (
    <>
      <Modal
        open={opentime}
        onClose={() => {
          setOpentime(false);
          setEditingTimeSlot(null);
        }}
        title={
          editingTimeSlot
            ? t("COMMON.UPDATE_TIMING")
            : t("COMMON.CREATE_TIMING")
        }
        size="md"
      >
        <EventCreateTimingModal
          setOpenForm={handleTimeSlotCreated}
          startDate={oppStartDate}
          endDate={oppEndDate}
          startTime={oppStartTime}
          endTime={oppEndTime}
          editTimeSlot={editingTimeSlot}
          participantsNeeded={participantsNeeded}
          autoSetTimeOnClick={!editingTimeSlot}
        />
      </Modal>

      <Modal
        open={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
          setSlotIdToDelete(null);
        }}
        title={t("COMMON.CONFIRM_DELETE")}
        size="sm"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              onClick={handleConfirmAction}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => {
                setShowConfirmModal(false);
                setConfirmAction(null);
                setSlotIdToDelete(null);
              }}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <h2 className="text-center pb-10 text-lg">
          {confirmAction === "delete"
            ? t("COMMON.CONFIRM_DELETE_TIME_SLOT")
            : t("COMMON.CONFIRM_CLEAR_TIME_SLOTS")}
        </h2>
      </Modal>

      <div className="bg-white">
        {/* Horizontally scrollable table container */}
        <div className="overflow-x-auto">
          {noTimeSlots && (
            <div className="text-center pb-5">
              <p className="text-gray-500">{t("COMMON.NO_TIME_SLOTS")}</p>
            </div>
          )}

          {Object.entries(groupedTimeSlots).map(([date, slots], dateIndex) => (
            <div key={date} className={`mb-0 ${dateIndex > 0 ? "pt-6" : ""}`}>
              <table className="w-full border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 w-1/4 text-gray-600">
                      {t("COMMON.DATE")}
                    </th>
                    <th className="text-left py-3 px-4 w-1/4 text-gray-600">
                      {date}
                    </th>
                    <th className="text-center py-3 px-4 w-1/4 text-gray-600">
                      {t("COMMON.NEEDED")}
                    </th>
                    <th className="text-center py-3 px-4 w-1/4 text-gray-600">
                      {t("COMMON.ACTION")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(slots as any[]).map((slot, index) => (
                    <tr key={slot.id} className="border-b border-gray-200">
                      <td className="py-3 px-4 text-gray-600">{index + 1}-</td>
                      <td className="py-3 px-4 miniscreen8:text-[14px] xss2:text-[13px]">
                        {slot.time}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="w-[59px] bg-[#29246D08]/5 text-primary-4 bg-primary-5/10 border border-primary-5/10 rounded-xl px-3 py-1 inline-block">
                          {slot.needed}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-4 mobilescreen:gap-2">
                          <button
                            className="text-primary-5 cursor-pointer"
                            onClick={() => handleEditClick(slot.id)}
                          >
                            <FiEdit size={windowWidth <= 767 ? 18 : 20} />
                          </button>
                          <button
                            className="text-primary-5 cursor-pointer"
                            onClick={() => handleDeleteClick(slot.id)}
                          >
                            <RiDeleteBin5Fill
                              size={windowWidth <= 767 ? 18 : 20}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="flex xss:flex-col justify-center pt-5 xss:pt-10 w-full gap-5">
          <Button
            variant="primary"
            size="medium"
            className="xss:!w-full"
            onClick={() => setOpentime(true)}
          >
            {t("COMMON.ADD_TIMINGS")}
          </Button>
          <Button
            variant="primary"
            size="medium"
            className="xss:!w-full disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSaveTimeSlots}
            disabled={disableSaveButton}
          >
            {t("COMMON.SAVE")}
          </Button>
        </div>
      </div>
    </>
  );
}
