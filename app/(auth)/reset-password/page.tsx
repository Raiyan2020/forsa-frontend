"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";

function ResetPasswordPageComponent() {
  const searchParams = useSearchParams();

  return (
    <ResetPasswordForm
      email={searchParams.get("email") || ""}
      token={searchParams.get("token") || ""}
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageComponent />
    </Suspense>
  );
}
