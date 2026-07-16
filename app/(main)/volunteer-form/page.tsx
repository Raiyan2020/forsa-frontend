"use client";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import VolunteerForm from "@/features/opportunities/components/VolunteerForm";

export default function Page() {
  return (
    <ProtectedRoute userType={"organization"}>
      <VolunteerForm />
    </ProtectedRoute>
  );
}
