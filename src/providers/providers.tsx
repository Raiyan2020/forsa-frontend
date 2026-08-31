"use client";

/**
 * Single client composition root (mirrors the reference architecture's
 * `providers/providers.tsx`): every client-side context provider stacks here so
 * the root layout stays a thin Server Component.
 *
 * Order matters: GoogleOAuth is outermost so any nested component can call
 * `useGoogleLogin`; Query and i18n wrap the whole app.
 */
import { GoogleOAuthProvider } from "@react-oauth/google";

import { I18nProvider } from "@/providers/i18n";
import { QueryProvider } from "@/providers/query";

// A placeholder keeps the provider mounted (and dev setups without the env
// var rendering) — real logins are rejected by Google for an invalid client id.
const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.trim() !== ""
    ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    : "100000000000-dummyclientid.apps.googleusercontent.com";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryProvider>
        <I18nProvider>{children}</I18nProvider>
      </QueryProvider>
    </GoogleOAuthProvider>
  );
}
