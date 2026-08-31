/**
 * `POST /social-auth/` is both the login and the register endpoint: it issues a
 * token for a known email and creates the account for an unknown one. What it
 * will not do is create a half-account — a brand-new volunteer must arrive with
 * `civil_id`, a brand-new organization with its company details — so the sign-up
 * screens ask `POST /check-user/` first and send anyone new through the matching
 * onboarding screen before the single social-auth call.
 *
 * Two payloads ride along in sessionStorage between those screens:
 *   `oauth_user`  — the provider profile (email, names, provider id, picture).
 *   `social_signup_prefill` — whatever the visitor had already typed into the
 *   registration form before clicking Google / LinkedIn, so the onboarding
 *   screen does not make them type it a second time. LinkedIn leaves the page
 *   entirely, so this has to survive a full reload, not just a `router.push`.
 */

export const OAUTH_USER_KEY = "oauth_user";
const SOCIAL_PREFILL_KEY = "social_signup_prefill";

export interface SocialProfile {
  email: string;
  first_name?: string;
  last_name?: string;
  social_media_id?: string;
  social_media_provider: string;
  social_profile_pic_url?: string;
}

export type SocialUserType = "volunteer" | "organization";

interface StoredPrefill {
  user_type: SocialUserType;
  values: Record<string, unknown>;
}

/** Where a brand-new account of this type finishes signing up. */
export function socialOnboardingRoute(userType: SocialUserType): string {
  return userType === "organization"
    ? "/complete-details"
    : "/volunteer-mandate-details";
}

export function stashSocialProfile(profile: SocialProfile): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OAUTH_USER_KEY, JSON.stringify(profile));
  } catch {
    // Private mode / quota — the onboarding screen just starts empty.
  }
}

/**
 * Drop the empty fields before stashing: a blank prefill value would otherwise
 * count as "already answered" and blank out a field the provider could fill.
 */
export function setSocialPrefill(
  userType: SocialUserType,
  values: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const filled: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(values)) {
    if (value === "" || value === null || value === undefined) continue;
    filled[field] = value;
  }

  try {
    if (Object.keys(filled).length === 0) {
      sessionStorage.removeItem(SOCIAL_PREFILL_KEY);
      return;
    }
    const payload: StoredPrefill = { user_type: userType, values: filled };
    sessionStorage.setItem(SOCIAL_PREFILL_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Read the prefill once and drop it, so a flow that was abandoned halfway
 * cannot repopulate an unrelated sign-up later in the same tab. Returns null
 * when the stash belongs to the other account type.
 */
export function takeSocialPrefill(
  userType: SocialUserType
): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SOCIAL_PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SOCIAL_PREFILL_KEY);
    const stored = JSON.parse(raw) as StoredPrefill;
    if (!stored || stored.user_type !== userType) return null;
    return stored.values ?? null;
  } catch {
    return null;
  }
}

export function clearSocialSignupState(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(OAUTH_USER_KEY);
    sessionStorage.removeItem(SOCIAL_PREFILL_KEY);
  } catch {
    // ignore
  }
}

/** Overlay the stashed answers onto a form's defaults, ignoring unknown fields. */
export function applyPrefill<T extends Record<string, unknown>>(
  defaults: T,
  prefill: Record<string, unknown> | null
): T {
  if (!prefill) return defaults;
  const merged: Record<string, unknown> = { ...defaults };
  for (const [field, value] of Object.entries(prefill)) {
    if (!(field in defaults)) continue;
    merged[field] = value;
  }
  return merged as T;
}
