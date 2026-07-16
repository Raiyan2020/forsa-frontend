"use client";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import LearnServeForm from "@/features/opportunities/components/LearnServeForm";

export default function Page() {
  return (
    <ProtectedRoute userType={"organization"}>
      <LearnServeForm />
    </ProtectedRoute>
  );
}
