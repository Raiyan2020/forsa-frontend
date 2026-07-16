"use client";

import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: "volunteer" | "organization" | Array<"volunteer" | "organization">;
}

/**
 * Client-side guard that redirects to /login when:
 * - User is not authenticated
 * - User's type doesn't match the required userType
 */
export default function ProtectedRoute({
  children,
  userType,
}: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (userType) {
      const allowed = Array.isArray(userType) ? userType : [userType];
      // Map "individual" → "volunteer" for backwards compat with backend type names
      const effectiveType =
        user.user_type === "individual" ? "volunteer" : user.user_type;
      if (!allowed.includes(effectiveType as "volunteer" | "organization")) {
        router.replace("/");
      }
    }
  }, [user, userType, router]);

  // Don't render anything until auth check passes
  if (!user) return null;

  if (userType) {
    const allowed = Array.isArray(userType) ? userType : [userType];
    const effectiveType =
      user.user_type === "individual" ? "volunteer" : user.user_type;
    if (!allowed.includes(effectiveType as "volunteer" | "organization")) {
      return null;
    }
  }

  return <>{children}</>;
}
