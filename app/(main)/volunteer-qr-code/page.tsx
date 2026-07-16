"use client";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import QRCode from "@/features/profile/components/QRCode";

export default function Page() {
  return (
    <ProtectedRoute userType={"volunteer"}>
      <QRCode />
    </ProtectedRoute>
  );
}
