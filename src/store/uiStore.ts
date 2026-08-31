import { create } from "zustand";

// ── TimeSlots (from timeSlotsSlice) ────────────────────────────────────────

export interface TimeSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  participants_needed: number;
}

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

export const useTimeSlotsStore = create<TimeSlotsState>((set) => ({
  timeSlots: [],
  eventDetails: null,
  addTimeSlot: (slot) =>
    set((state) => ({ timeSlots: [...state.timeSlots, slot] })),
  updateTimeSlot: (slot) =>
    set((state) => ({
      timeSlots: state.timeSlots.map((s) => (s.id === slot.id ? slot : s)),
    })),
  deleteTimeSlot: (id) =>
    set((state) => ({
      timeSlots: state.timeSlots.filter((s) => s.id !== id),
    })),
  clearTimeSlots: () => set({ timeSlots: [] }),
  setTimeSlots: (slots) => set({ timeSlots: slots }),
  setEventDetails: (details) => set({ eventDetails: details }),
}));

// ── RoleModal (from roleModalSlice) ────────────────────────────────────────

interface RoleModalState {
  isOpen: boolean;
  opportunityId: string | null;
  openRoleModal: () => void;
  closeRoleModal: () => void;
  setOpportunityId: (id: string | null) => void;
  clearRoleModal: () => void;
}

export const useRoleModalStore = create<RoleModalState>((set) => ({
  isOpen: false,
  opportunityId: null,
  openRoleModal: () => set({ isOpen: true }),
  closeRoleModal: () => set({ isOpen: false }),
  setOpportunityId: (id) => set({ opportunityId: id }),
  clearRoleModal: () => set({ isOpen: false, opportunityId: null }),
}));
