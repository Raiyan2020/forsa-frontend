"use client";

import { useAuthStore } from "@/store/authStore";
import HomepageAuthenticated from "@/features/home/components/HomepageAuthenticated";

/**
 * This tiny client island checks auth state after hydration.
 * If the user is logged in, it takes over and renders the authenticated homepage.
 * If not logged in, it renders nothing — the public homepage (SSR) stays visible.
 */
export default function HomepageClientGate() {
  const user = useAuthStore((s) => s.user);

  if (!user?.user_type) {
    // Not logged in — the SSR public homepage is already visible.
    return null;
  }

  // Logged in — replace the public homepage with the authenticated view.
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        background: "white",
        overflowY: "auto",
      }}
    >
      <HomepageAuthenticated />
    </div>
  );
}
