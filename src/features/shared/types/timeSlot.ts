/**
 * A draft time slot for an event or learn-&-serve opportunity. Shared because
 * it's built by `features/events/components/EventTimeSlotModal.tsx`, held by
 * `store/timeSlotsStore.ts`, and consumed by `features/opportunities/components/LearnServeForm.tsx`.
 */
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
