"use client";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import VolunteerProfile from "@/features/profile/components/VolunteerProfile";

export default function Page() {
  return (
    <ProtectedRoute userType={"volunteer"}>
      <VolunteerProfile />
    </ProtectedRoute>
  );
}
