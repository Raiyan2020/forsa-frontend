import moment from "moment";
import { toNumber } from "@/lib/helpers";
import {
  getCheckInWindow,
  type CheckInWindow,
} from "@/features/opportunities/checkInWindow";
import {
  canToggleRegistration,
  getOpportunityButtonLabelKey,
  getOpportunityButtonState,
  isCreatorRepostState,
  isOpportunityButtonActionable,
  isViewerOrganizer,
  type OpportunityButtonState,
} from "@/features/shared/opportunityButtonState";
import type {
  OpportunityCreator,
  VolunteerOpportunityDetail,
} from "./types";

/**
 * Every rule that decides what the volunteer-opportunity page shows, as one
 * pure function of the payload and the viewer.
 *
 * These used to be forty-odd `const`s between the component's loading early
 * return and its JSX. That placement is what made the page fragile: anything
 * written there with a hook in it is a *conditional* hook, which is exactly how
 * a `useMemo` crashed the page with "Rendered more hooks than during the
 * previous render". A plain function cannot have that bug, and can be read —
 * or tested — without rendering anything.
 */

/** Who is looking. Only the handful of fields the rules actually read. */
export interface VolunteerEventViewer {
  id?: number | string | null;
  /** A user record is present in the auth store. */
  signedIn: boolean;
  /** …and it carries a token. */
  hasAuthToken: boolean;
  isVerified: boolean;
  userType?: string | null;
}

export interface VolunteerEventView {
  isCreator: boolean;
  isCompleted: boolean;
  isRejected: boolean;

  /** Registration was shut by hand, or the backend reports the window shut. */
  closedByCreator: boolean;
  isRegistrationClosed: boolean;
  isRepostState: boolean;

  /** The viewer's register / unregister button, or the creator's Edit / Repost. */
  showActionButton: boolean;
  actionLabelKey: string;
  /** Started / Ended / Full / Closed are states, not actions. */
  isViewerActionDisabled: boolean;
  viewerButtonState: OpportunityButtonState;

  canCloseRegistration: boolean;
  canReopenRegistration: boolean;
  canRequestDeletion: boolean;
  canSendCertificates: boolean;

  checkInWindow: CheckInWindow;
  canManageAttendance: boolean;
  canGenerateAttendanceQr: boolean;
  canShowScanPermission: boolean;
  /** A delegated scanner (not the creator) — offered on mobile only. */
  canShowScanQR: boolean;
}

/** Strict ISO parse, UTC. Null for absent or unparseable input. */
export function parseIsoUtcDate(value?: string | null): moment.Moment | null {
  if (!value) return null;
  const parsed = moment.utc(value, moment.ISO_8601, true);
  return parsed.isValid() ? parsed : null;
}

export function deriveVolunteerEventView(
  data: VolunteerOpportunityDetail | undefined,
  viewer: VolunteerEventViewer,
  now: moment.Moment = moment.utc()
): VolunteerEventView {
  // `/opportunities/{id}/details/` reports ownership through
  // `relationship_tags` and no longer sends `is_creator`, so the check ORs
  // every signal — see `isViewerOrganizer`.
  const isCreator = isViewerOrganizer(data, viewer.id);

  const dueDate = parseIsoUtcDate(data?.due_date);
  const startDate = parseIsoUtcDate(data?.start_date);
  const endDate = parseIsoUtcDate(data?.end_date);
  const status = data?.opportunity_status?.toLowerCase();

  // Some legacy records are marked completed even though their scheduled start
  // is still in the future. Trust the schedule for that contradictory state so
  // an otherwise open opportunity keeps its registration action.
  const startsInFuture = Boolean(startDate?.isAfter(now, "day"));
  const isCompleted = status === "completed" && !startsInFuture;

  /*
   * No due date means registration stays open until the opportunity *ends* —
   * `HasRegistrationWindow::registrationClosesAt()` falls back to `end_date`,
   * never `start_date`. Falling back to the start here would hide the button a
   * day into an opportunity the server was still accepting volunteers for.
   */
  const registrationDeadline = dueDate ?? endDate ?? startDate;
  const closedByCreator =
    data?.is_registration_closed === true || data?.is_registration_open === false;
  // An explicit `is_registration_open: true` is authoritative — the local
  // due-date heuristic fires a day early on UTC boundaries and must not veto it.
  const isRegistrationClosed =
    closedByCreator ||
    (data?.is_registration_open !== true &&
      Boolean(registrationDeadline && now.isAfter(registrationDeadline, "day")));

  // Server-computed first; `isAtCapacity()` is exactly the rule below, which
  // stays only for a payload that omits the flag.
  const isFull =
    data?.is_full ??
    (toNumber(data?.participants_needed) > 0 &&
      toNumber(data?.registered_volunteers_count) >=
        toNumber(data?.participants_needed));

  // `action_state` is authoritative whenever present — and the detail endpoint
  // always sends it. The fallback covers only a payload that predates it, and
  // prefers the server's `has_started` over a start-of-day guess that reads a
  // same-day opportunity as started from midnight.
  const hasStarted =
    data?.has_started ??
    moment().isAfter(moment(data?.start_date).startOf("day"));
  const isRepostState =
    isCreator &&
    (data?.action_state
      ? isCreatorRepostState(data)
      : isCompleted || status === "inprogress" || hasStarted);

  // The creator's own Edit / Repost is never gated on verification — the list
  // cards never hid it either. Only a viewer's register action is.
  const showActionButton =
    isCreator ||
    ((viewer.signedIn ? viewer.isVerified : true) &&
      !isCompleted &&
      !isRegistrationClosed &&
      Boolean(
        data?.is_registered || (viewer.userType !== "organization" && !isFull)
      ));

  /*
   * One control over one window: the publisher may flip registration either
   * way until a day before the end date (`canToggleRegistration`). Reopening
   * only makes sense after an explicit close — a window shut by its due date
   * reopens on its own schedule.
   */
  const canManageRegistration =
    isCreator && !isCompleted && canToggleRegistration(data);
  const canCloseRegistration = canManageRegistration && !isRegistrationClosed;
  const canReopenRegistration =
    canManageRegistration && data?.is_registration_closed === true;

  const isRejected = data?.approval_status === "rejected";
  // Matches the cards: deletion is requested before the opportunity starts.
  const canRequestDeletion =
    isCreator && status !== "completed" && status !== "inprogress";
  // Completion issues certificates for everyone already marked attended; this
  // is for attendance recorded after that pass, and is safe to repeat (BE-14).
  const canSendCertificates = isCreator && status === "completed";

  const viewerButtonState = getOpportunityButtonState(data);
  const actionLabelKey = isRejected
    ? "COMMON.EDIT_AND_RESUBMIT"
    : isRepostState
      ? "COMMON.REPOST"
      : isCreator
        ? "COMMON.EDIT_TEXT"
        : viewerButtonState === "register" && !viewer.hasAuthToken
          ? "COMMON.REGISTER_NOW"
          : getOpportunityButtonLabelKey(viewerButtonState);

  const isViewerActionDisabled =
    !isRejected &&
    !isRepostState &&
    !isCreator &&
    !isOpportunityButtonActionable(viewerButtonState);

  /*
   * The attendance window, its deadline and whether it is open all come from
   * the backend (default 72h past the end date, admin-editable). QR and manual
   * attendance run side by side.
   */
  const checkInWindow = getCheckInWindow(data);

  return {
    isCreator,
    isCompleted,
    isRejected,
    closedByCreator,
    isRegistrationClosed,
    isRepostState,
    showActionButton,
    actionLabelKey,
    isViewerActionDisabled,
    viewerButtonState,
    canCloseRegistration,
    canReopenRegistration,
    canRequestDeletion,
    canSendCertificates,
    checkInWindow,
    /*
     * BE-69 — the volunteer list opens to the organizer *and* a volunteer they
     * granted «إذن تحضير». Only the list: every other control in that row
     * keeps its own `isCreator` gate.
     */
    canManageAttendance: isCreator || data?.can_manage_attendance === true,
    // The pair is permanent and printed, so it is needed *before* the first
    // day — only a completed opportunity has nothing left to record.
    canGenerateAttendanceQr: isCreator && !isCompleted,
    canShowScanPermission: isCreator && checkInWindow.qrEnabled,
    canShowScanQR:
      !isCreator &&
      data?.has_scan_permission === true &&
      checkInWindow.qrEnabled &&
      checkInWindow.isOpen,
  };
}

// ─── Presentation helpers ───────────────────────────────────────────────────
// Pure reads of the payload, shared by the section components so each can
// render from `data` alone.

/** Title in the opportunity's own `primary_language`, as the heading uses. */
export function opportunityTitle(data?: VolunteerOpportunityDetail): string {
  return (
    (data?.primary_language === "ar" ? data?.title_ar : data?.title_en) || ""
  );
}

export function organizerProfilePath(creator?: OpportunityCreator | null): string {
  return creator?.is_public
    ? `/public-profile/${creator.id}`
    : `/volunteer-private-profile/${creator?.id}`;
}

/*
 * An opportunity can answer "where" with a maps link instead of a pin. The API
 * used to fall `location_url` back to `link` — the WhatsApp number — so an empty
 * location opened a WhatsApp chat when someone clicked the address. BE-60 fixed
 * that server-side; the guard stays because it costs nothing and the failure
 * mode is embarrassing.
 */
export function resolveLocationUrl(data?: VolunteerOpportunityDetail): string | null {
  return data?.location_url && data.location_url !== data?.link
    ? data.location_url
    : null;
}

/** The exact days a separate-days opportunity runs, ascending and de-duplicated. */
export function scheduledDaysOf(data?: VolunteerOpportunityDetail): string[] {
  const slots = data?.time_slots;
  if (!Array.isArray(slots)) return [];
  return [
    ...new Set(
      slots
        .map((slot) => slot?.date?.slice(0, 10))
        .filter((day): day is string => Boolean(day))
    ),
  ].sort();
}

/** Length of one start→end shift in hours, rolling an overnight shift forward. */
function shiftHours(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const hours = moment
    .duration(moment(end, "HH:mm:ss").diff(moment(start, "HH:mm:ss")))
    .asHours();
  // 21:00 → 01:00 is four hours, not minus twenty. Mirrors the backend's
  // `VolunteerOpportunityTimeSlot::durationInHours()`.
  return hours < 0 ? hours + 24 : hours;
}

/**
 * Total commitment, as whole hours and remaining minutes.
 *
 * For a separate-days opportunity the backend already computes each slot's
 * length (`time_slots[].hours`), so those are summed — which is also the only
 * reading that stays right if the days ever run different hours. A consecutive
 * range is hours-per-day × the days in it.
 */
export function totalCommitment(data?: VolunteerOpportunityDetail): {
  hrs: number;
  mins: number;
} {
  if (!data) return { hrs: 0, mins: 0 };

  const slots = data.time_slots ?? [];
  const slotHours = slots.map((slot) => slot?.hours);
  const serverSummable =
    slots.length > 0 && slotHours.every((h) => typeof h === "number");

  let totalHours: number;
  if (serverSummable) {
    totalHours = (slotHours as number[]).reduce((sum, h) => sum + h, 0);
  } else {
    const days = scheduledDaysOf(data);
    const numberOfDays =
      days.length > 0
        ? days.length
        : moment(data.end_date).diff(moment(data.start_date), "days") + 1;
    totalHours = shiftHours(data.start_time, data.end_time) * numberOfDays;
  }

  const hrs = Math.floor(totalHours);
  return { hrs, mins: Math.round((totalHours - hrs) * 60) };
}

/** Places still open; never negative. */
export function remainingPlaces(data?: VolunteerOpportunityDetail): number {
  return Math.max(
    0,
    toNumber(data?.participants_needed) -
      toNumber(data?.registered_volunteers_count)
  );
}
