/**
 * React Router let a `navigate(path, { state })` call hand a payload to the next
 * screen. The App Router has no equivalent, so screens that were driven by
 * `location.state` read their payload from sessionStorage instead: the navigating
 * component writes it immediately before `router.push`, and the destination reads
 * it once on mount.
 */

import { useEffect, useRef, useState } from "react";

export const NAV_STATE_KEYS = {
  /** Opportunity / learn & serve registration → /register-now */
  opportunityThankyou: "opportunity_thankyou_details",
  /**
   * Opportunity row → /learn-share-register-list, /leran-share-register-list,
   * /volunteerlist. Events are announcement-only and have no register list.
   */
  registerList: "register_list_details",
  /** Opportunity row → /scan-permission */
  scanPermission: "scan_permission_details",
  /** Event card "edit"/"repost" → /event-form */
  eventForm: "event_form_details",
  /** Opportunity card "edit"/"repost" → /volunteer-form */
  volunteerForm: "volunteer_form_details",
  /**
   * Learn & serve card "repost" → /learn-and-share-form. Editing has its own
   * URL (`/learn-and-share-form/edit/{id}`) and no longer needs this payload.
   */
  learnServeForm: "learn_serve_form_details",
  /** LinkedIn sign-up handoff, consumed by the volunteer mandate modal */
  linkedinNewUser: "linkedin_new_user_data",
  /**
   * JoinUs "Volunteer Team" shortcut → /entities-form or /complete-details.
   * The destination pre-selects the `organizer_type` matching the backend's
   * "Volunteer Team" org_type choice once it loads (registration still submits
   * as `user_type: "organization"` — a volunteer team is an org subtype).
   */
  joinAsVolunteerTeam: "join_as_volunteer_team",
} as const;

export type NavStateKey = (typeof NAV_STATE_KEYS)[keyof typeof NAV_STATE_KEYS];

/** Stash a payload for the screen that is about to be pushed. */
export function setNavState(key: NavStateKey, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private-mode / quota failures are not worth blocking navigation over.
  }
}

/** Read a payload stashed by the previous screen. Returns null when absent or malformed. */
export function getNavState<T>(key: NavStateKey): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Read a payload and drop it in the same breath. React Router's `location.state`
 * did not survive a fresh navigation to the same route, so any screen that can
 * also be reached *without* a payload (the create/edit forms) must consume it
 * once — otherwise a stale edit target turns the next "create" into an edit.
 */
export function takeNavState<T>(key: NavStateKey): T | null {
  const value = getNavState<T>(key);
  if (value !== null) {
    consumedThisPageLoad.set(key, value);
    clearNavState(key);
  }
  return value;
}

/**
 * What `takeNavState` has removed since this page was loaded.
 *
 * Module-level on purpose: it is wiped by the very reload it exists to
 * survive, which is exactly the lifetime we want. A value only goes back into
 * sessionStorage when something explicitly asks for it below.
 */
const consumedThisPageLoad = new Map<NavStateKey, unknown>();

/**
 * Put back every payload consumed during this page load, immediately before a
 * deliberate reload of the same URL.
 *
 * `takeNavState` clears on read so that a later visit to `/volunteer-form`
 * with no payload is a clean "create" rather than a stale edit. A reload is
 * the one case where that is wrong: it is the *same* visit, and the screen
 * needs its payload a second time. Without this, switching language on a
 * repost form would come back as a blank create form and the target would be
 * silently gone.
 *
 * It is not a general "undo": nothing calls it on navigation, so the
 * clear-on-read guarantee is untouched everywhere else.
 */
export function restoreConsumedNavState(): void {
  consumedThisPageLoad.forEach((value, key) => {
    setNavState(key, value);
  });
}

export function clearNavState(key: NavStateKey): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Reads (and clears) a stashed nav-state payload exactly once per mount.
 *
 * A plain `useEffect(() => setState(takeNavState(key)), [])` breaks under
 * React 18/19 Strict Mode's development-only double-invoke: the effect body
 * runs twice on mount, and since `takeNavState` clears the payload on read,
 * the second call finds nothing and stomps the first call's real value with
 * an empty object — the edit/repost target silently disappears in `next dev`
 * only. The ref guard makes the actual take-and-clear happen once per
 * component instance no matter how many times Strict Mode re-runs the effect.
 */
export function useConsumedNavState<T>(key: NavStateKey): T | null {
  const [state, setState] = useState<T | null>(null);
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;
    setState(takeNavState<T>(key) ?? ({} as T));
  }, [key]);

  return state;
}
