"use client";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import EventForm from "@/features/events/components/EventForm";

export default function Page() {
  return (
    <ProtectedRoute userType="organization">
      <EventForm />
    </ProtectedRoute>
  );
}
