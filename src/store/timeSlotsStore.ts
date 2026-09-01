import { create } from "zustand";
import type { TimeSlot } from "@/features/shared";

interface EventDetails {
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
}

interface TimeSlotsState {
  timeSlots: TimeSlot[];
  eventDetails: EventDetails | null;
  addTimeSlot: (slot: TimeSlot) => void;
  updateTimeSlot: (slot: TimeSlot) => void;
  deleteTimeSlot: (id: number) => void;
  clearTimeSlots: () => void;
  setTimeSlots: (slots: TimeSlot[]) => void;
  setEventDetails: (details: EventDetails) => void;
}

/**
 * Draft time slots for an event / learn-&-serve opportunity, held in memory
 * while the creator builds them up before the form is submitted.
 */
export const useTimeSlotsStore = create<TimeSlotsState>((set) => ({
  timeSlots: [],
  eventDetails: null,

  addTimeSlot: (slot) =>
    set((state) => ({ timeSlots: [...state.timeSlots, slot] })),

  updateTimeSlot: (slot) =>
    set((state) => ({
      timeSlots: state.timeSlots.map((existing) =>
        existing.id === slot.id ? slot : existing
      ),
    })),

  deleteTimeSlot: (id) =>
    set((state) => ({
      timeSlots: state.timeSlots.filter((slot) => slot.id !== id),
    })),

  clearTimeSlots: () => set({ timeSlots: [] }),

  setTimeSlots: (timeSlots) => set({ timeSlots }),

  setEventDetails: (eventDetails) => set({ eventDetails }),
}));
