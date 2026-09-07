/**
 * The single registration-button rule for opportunities and events.
 *
 * Before this existed, `getButtonText` was copy-pasted into five card
 * components and both detail screens, each drifting slightly — some derived
 * "closed" from `due_date`, none of them surfaced the started/ended states at
 * all. The client asked for six states driven by the API's own flags, so the
 * decision lives here and the components only render it.
 *
 * The backend now computes this itself and returns it as `action_state`
 * (confirmed live on `/list-volunteer-opportunities/` as of 2026-08-24), so
 * that value is used whenever present — it's authoritative and sidesteps the
 * order ambiguity below entirely. The local heuristic remains only as a
 * fallback for payloads that predate the field (or omit it).
 *
 * Fallback evaluation order (first match wins):
 *
 *   Ended → Started → Unregister → Full → Closed → Register
 *
 * NOTE — this deviates from the spec's stated order (`Ended → Started → Full →
 * Closed → Unregister → Register`) in one place: `Unregister` is checked before
 * `Full`/`Closed`. Taken literally, the spec's order strands a registered
 * volunteer on a full opportunity — their own registration is part of what
 * makes it full, so they would see "Full" and never get an unregister button.
 * `Full` and `Closed` answer "can *I* still join?", which is only meaningful
 * for someone not already registered.
 */

import moment from "moment";
import { toNumber } from "@/lib/helpers";

export type OpportunityButtonState =
  | "ended"
  | "started"
  | "full"
  | "closed"
  | "unregister"
  | "register";

const OPPORTUNITY_BUTTON_STATES: ReadonlySet<string> = new Set([
  "ended",
  "started",
  "full",
  "closed",
  "unregister",
  "register",
]);

/** The subset of an opportunity/event payload the rule reads. */
export interface OpportunityButtonSource {
  action_state?: string | null;
  opportunity_status?: string | null;
  is_registered?: boolean | null;
  is_registration_open?: boolean | null;
  is_registration_closed?: boolean | null;
  /** The API sends these as Arabic-Indic digit strings under `ar` — run through `toNumber()`. */
  registered_volunteers_count?: number | string | null;
  participants_needed?: number | string | null;
}

/** i18n key each state renders with. */
const STATE_LABEL_KEYS: Record<OpportunityButtonState, string> = {
  ended: "COMMON.ENDED",
  started: "COMMON.STARTED",
  full: "COMMON.FULL",
  closed: "COMMON.CLOSED",
  unregister: "COMMON.UNREGISTER",
  register: "COMMON.REGISTER",
};

/** Only `unregister` and `register` are actions; the rest are read-only states. */
const ACTIONABLE_STATES: ReadonlySet<OpportunityButtonState> = new Set<
  OpportunityButtonState
>(["unregister", "register"]);

export function getOpportunityButtonState(
  item: OpportunityButtonSource | null | undefined
): OpportunityButtonState {
  if (!item) return "register";

  if (item.action_state && OPPORTUNITY_BUTTON_STATES.has(item.action_state)) {
    return item.action_state as OpportunityButtonState;
  }

  if (item.opportunity_status === "completed") return "ended";
  if (item.opportunity_status === "inprogress") return "started";

  // Checked ahead of full/closed so a registered volunteer keeps a way out —
  // see the note above.
  if (item.is_registered) return "unregister";

  const registered = toNumber(item.registered_volunteers_count);
  const needed = toNumber(item.participants_needed);
  if (needed > 0 && registered >= needed) {
    return "full";
  }

  // Two independent ways the backend reports a shut registration window: an
  // explicit close, or the open flag simply going false.
  if (item.is_registration_closed === true || item.is_registration_open === false) {
    return "closed";
  }

  return "register";
}

export function getOpportunityButtonLabelKey(
  state: OpportunityButtonState
): string {
  return STATE_LABEL_KEYS[state];
}

/** The subset of a payload the creator's Edit/Repost decision reads. */
export interface CreatorRepostSource {
  action_state?: string | null;
  opportunity_status?: string | null;
  start_date?: string | null;
}

/**
 * Whether a creator's own opportunity should show "Repost" instead of "Edit".
 *
 * Prefers `action_state` when present — it's authoritative and sidesteps the
 * legacy heuristic's same-day bug (`moment().isAfter(startOf(day))` is true
 * for the *entire* start day, so an event scheduled for tonight showed
 * "Repost" from midnight on). Falls back to the status+date heuristic only
 * for payloads that predate the field.
 */
export function isCreatorRepostState(
  item: CreatorRepostSource | null | undefined
): boolean {
  if (!item) return false;
  if (item.action_state) {
    return item.action_state === "started" || item.action_state === "ended";
  }
  return (
    item.opportunity_status === "inprogress" ||
    item.opportunity_status === "completed" ||
    moment().isAfter(moment(item.start_date).startOf("day"))
  );
}

/** True when pressing the button does something (register / unregister). */
export function isOpportunityButtonActionable(
  state: OpportunityButtonState
): boolean {
  return ACTIONABLE_STATES.has(state);
}

/** The subset of a payload the "is the viewer this opportunity's organizer?" check reads. */
export interface OrganizerSource {
  /** `organizer` / `sponsor` / `registered` / `attended`, computed per requesting user. */
  relationship_tags?: string[] | null;
  /** Legacy flag — missing on newer detail payloads, false/absent on some older ones. */
  is_creator?: boolean | null;
  created_by?: { id?: number | string | null } | null;
}

/**
 * Whether the current viewer owns this opportunity.
 *
 * Three signals, ORed, because none of them is reliable on its own:
 *   1. `relationship_tags` contains `"organizer"` — the current, per-user field.
 *      `GET /opportunities/{id}/details/` no longer sends `is_creator` at all,
 *      so this is the only positive signal on that response.
 *   2. `is_creator` — still sent by the list endpoints; false/missing on some
 *      records that really are the viewer's (see opportunity #121).
 *   3. `created_by.id === user.id` — what the cards have always compared, and
 *      the only fallback for payloads carrying neither field.
 */
export function isViewerOrganizer(
  item: OrganizerSource | null | undefined,
  userId?: number | string | null
): boolean {
  if (!item) return false;
  if (item.relationship_tags?.includes("organizer")) return true;
  if (item.is_creator) return true;
  return (
    Boolean(userId) && String(item.created_by?.id ?? "") === String(userId)
  );
}
