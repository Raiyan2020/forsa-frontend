"use client";

import { useSyncExternalStore } from "react";
import { useAuthStore } from "@/store/authStore";
import HomepageAuthenticated from "@/features/home/components/HomepageAuthenticated";

/** Never fires — the snapshot flips once, when hydration hands over to the client. */
const noopSubscribe = () => () => {};

/**
 * Chooses which homepage the visitor sees without giving up the SSR'd public
 * page: `children` is the server-rendered public homepage, present in the first
 * HTML byte, and it stays on screen until hydration proves someone is logged in.
 *
 * The swap happens in normal document flow. An earlier version layered the
 * authenticated view in a `position: fixed; inset: 0` overlay, which covered the
 * layout's footer and moved scrolling inside the overlay.
 */
export default function HomepageClientGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);

  // The auth store rehydrates from localStorage, so the first client render has
  // to match the server's (logged-out) HTML or React reports a hydration
  // mismatch. This reads false while hydrating and true immediately after.
  const isHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  if (isHydrated && user?.user_type) {
    return <HomepageAuthenticated />;
  }

  return <>{children}</>;
}
