"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import EmailVerificationForm from "@/features/auth/components/EmailVerificationForm";

function EmailVerificationPageComponent() {
  const searchParams = useSearchParams();

  return (
    <EmailVerificationForm
      email={searchParams.get("email") || ""}
      otp_type={searchParams.get("otp_type") || ""}
    />
  );
}

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={null}>
      <EmailVerificationPageComponent />
    </Suspense>
  );
}
