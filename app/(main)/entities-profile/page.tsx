"use client";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import OrganizerProfile from "@/features/profile/components/OrganizerProfile";

export default function Page() {
  return (
    <ProtectedRoute userType={"organization"}>
      <OrganizerProfile />
    </ProtectedRoute>
  );
}
