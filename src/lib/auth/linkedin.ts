/**
 * LinkedIn only honours redirect URIs that are registered verbatim in the
 * Developer App, so the whole site funnels through ONE of them:
 * `${NEXT_PUBLIC_FRONTEND_URL}/linkedin-callback`. Where the user came from and
 * where they should end up rides along in the `state` parameter instead.
 *
 * The same literal string has to appear in three places or the exchange fails:
 * the authorize URL, the `redirect_uri` body field of `POST /linkedin/callback/`,
 * and `LINKEDIN_REDIRECT_URI` in the backend `.env`.
 */

export const LINKEDIN_CALLBACK_PATH = "/linkedin-callback";

/**
 * `w_member_social` (posting on the member's behalf) is a separately approved
 * LinkedIn product and is not needed to sign someone in — requesting it makes
 * LinkedIn reject the authorize call with `unauthorized_scope_error`.
 */
export const LINKEDIN_SCOPE = "openid profile email";

export interface LinkedinOAuthState {
  /** Account type for a brand-new user; null when the entry point cannot know. */
  user_type?: string | null;
  /** Replayed to the backend verbatim — must equal the authorize URL's value. */
  redirect_uri: string;
  /** Standalone flows: where to land once signed in. */
  return_to?: string;
  /** Modal flows: the page hosting the modal, which re-opens it on return. */
  original_path?: string;
  /** Nonce, so two tabs cannot be confused for one another. */
  random: string;
}

export function getLinkedinRedirectUri(): string {
  const origin =
    process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin.replace(/\/+$/, "")}${LINKEDIN_CALLBACK_PATH}`;
}

function encodeState(state: LinkedinOAuthState): string {
  // btoa only accepts latin1, so widen through UTF-8 bytes first — a path can
  // carry non-ASCII characters.
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  return btoa(String.fromCharCode(...bytes));
}

export function decodeLinkedinState(raw: string): LinkedinOAuthState | null {
  try {
    const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
    const state = JSON.parse(new TextDecoder().decode(bytes));
    return state && typeof state === "object"
      ? (state as LinkedinOAuthState)
      : null;
  } catch {
    return null;
  }
}

/**
 * Sends the browser to LinkedIn's consent screen. Returns false — without
 * navigating — when `NEXT_PUBLIC_LINKEDIN_CLIENT_ID` is unset, so the caller can
 * say so rather than bouncing the user to a LinkedIn error page.
 */
export function startLinkedinLogin(options: {
  userType?: string | null;
  returnTo?: string;
  originalPath?: string;
}): boolean {
  const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID?.trim();
  if (!clientId) return false;

  const redirectUri = getLinkedinRedirectUri();
  const state = encodeState({
    user_type: options.userType ?? null,
    redirect_uri: redirectUri,
    ...(options.returnTo ? { return_to: options.returnTo } : {}),
    ...(options.originalPath ? { original_path: options.originalPath } : {}),
    random: Math.random().toString(36).substring(2),
  });

  window.location.href =
    "https://www.linkedin.com/oauth/v2/authorization?response_type=code" +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(LINKEDIN_SCOPE)}` +
    `&state=${encodeURIComponent(state)}`;

  return true;
}
