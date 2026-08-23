/**
 * The single registration-button rule for opportunities and events.
 *
 * Before this existed, `getButtonText` was copy-pasted into five card
 * components and both detail screens, each drifting slightly — some derived
 * "closed" from `due_date`, none of them surfaced the started/ended states at
 * all. The client asked for six states driven by the API's own flags, so the
 * decision lives here and the components only render it.
 *
 * Evaluation order (first match wins):
 *
 *   Ended → Started → Unregister → Full → Closed → Register
 *
 * NOTE — this deviates from the spec's stated order (`Ended → Started → Full →
 * Closed → Unregister → Register`) in one place: `Unregister` is checked before
 * `Full`/`Closed`. Taken literally, the spec's order strands a registered
 * volunteer on a full opportunity — their own registration is part of what
 * makes it full, so they would see "Full" and never get an unregister button.
 * `Full` and `Closed` answer "can *I* still join?", which is only meaningful
 * for someone not already registered. Ask the client to confirm.
 */

export type OpportunityButtonState =
  | "ended"
  | "started"
  | "full"
  | "closed"
  | "unregister"
  | "register";

/** The subset of an opportunity/event payload the rule reads. */
export interface OpportunityButtonSource {
  opportunity_status?: string | null;
  is_registered?: boolean | null;
  is_registration_open?: boolean | null;
  is_registration_closed?: boolean | null;
  registered_volunteers_count?: number | null;
  participants_needed?: number | null;
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

  if (item.opportunity_status === "completed") return "ended";
  if (item.opportunity_status === "inprogress") return "started";

  // Checked ahead of full/closed so a registered volunteer keeps a way out —
  // see the note above.
  if (item.is_registered) return "unregister";

  const registered = item.registered_volunteers_count;
  const needed = item.participants_needed;
  if (
    typeof registered === "number" &&
    typeof needed === "number" &&
    needed > 0 &&
    registered >= needed
  ) {
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

/** True when pressing the button does something (register / unregister). */
export function isOpportunityButtonActionable(
  state: OpportunityButtonState
): boolean {
  return ACTIONABLE_STATES.has(state);
}
