"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import Loader from "@/components/ui/Loader";
import LoginForm from "@/features/auth/components/LoginForm";

function LoginPageComponent() {
  const searchParams = useSearchParams();

  const userType = searchParams.get("user_type") || null;
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo =
    requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/";

  return <LoginForm userType={userType} returnTo={returnTo} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginPageComponent />
    </Suspense>
  );
}
