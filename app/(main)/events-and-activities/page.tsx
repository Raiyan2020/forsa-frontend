import Events from "@/features/events/components/Events";
import type { Metadata } from "next";
import { Suspense } from "react";
import Loader from "@/components/ui/Loader";

export const metadata: Metadata = {
  title: "Events and Activities",
  description: "Explore the latest events, seminars, sports, carnivals, and camp activities on Fursa.",
};

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <Events />
    </Suspense>
  );
}


