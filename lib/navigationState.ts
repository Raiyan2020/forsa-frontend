/**
 * React Router let a `navigate(path, { state })` call hand a payload to the next
 * screen. The App Router has no equivalent, so screens that were driven by
 * `location.state` read their payload from sessionStorage instead: the navigating
 * component writes it immediately before `router.push`, and the destination reads
 * it once on mount.
 */

export const NAV_STATE_KEYS = {
  /** Event registration → /event-thankyou */
  eventThankyou: "event_thankyou_details",
  /** Opportunity / learn & serve registration → /register-now */
  opportunityThankyou: "opportunity_thankyou_details",
  /** Opportunity or event row → /learn-share-register-list, /leran-share-register-list, /event-register-list, /volunteerlist */
  registerList: "register_list_details",
  /** Opportunity row → /scan-permission */
  scanPermission: "scan_permission_details",
  /** Event card "edit"/"repost" → /event-form */
  eventForm: "event_form_details",
  /** Opportunity card "edit"/"repost" → /volunteer-form */
  volunteerForm: "volunteer_form_details",
  /** Learn & serve card "edit"/"repost" → /learn-and-share-form */
  learnServeForm: "learn_serve_form_details",
  /** LinkedIn sign-up handoff, consumed by the volunteer mandate modal */
  linkedinNewUser: "linkedin_new_user_data",
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
  if (value !== null) clearNavState(key);
  return value;
}

export function clearNavState(key: NavStateKey): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
