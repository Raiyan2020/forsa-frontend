"use client";

import { Suspense } from "react";
import Loader from "@/components/ui/Loader";
import LinkedinCallback from "@/features/auth/components/LinkedinCallback";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <LinkedinCallback />
    </Suspense>
  );
}
