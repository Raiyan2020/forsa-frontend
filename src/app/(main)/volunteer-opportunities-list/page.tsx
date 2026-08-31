"use client";

import { Suspense } from "react";
import OpportunitiesList from "@/features/opportunities/components/OpportunitiesList";
import Loader from "@/components/ui/Loader";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <OpportunitiesList />
    </Suspense>
  );
}
