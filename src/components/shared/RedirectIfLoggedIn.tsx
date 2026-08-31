"use client";

import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirects already-authenticated users away from auth pages (login, join, etc.)
 * to the homepage — mirrors the React app's RedirectIfLoggedIn component.
 */
export default function RedirectIfLoggedIn({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  if (user) return null;

  return <>{children}</>;
}
