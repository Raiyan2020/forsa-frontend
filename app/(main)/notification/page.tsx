"use client";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import Notification from "@/features/notification/components/Notification";

export default function Page() {
  return (
    <ProtectedRoute userType={["volunteer", "organization"]}>
      <Notification />
    </ProtectedRoute>
  );
}
