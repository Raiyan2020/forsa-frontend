import Opportunities from "@/features/opportunities/components/Opportunities";
import type { Metadata } from "next";
import { Suspense } from "react";
import Loader from "@/components/ui/Loader";

export const metadata: Metadata = {
  title: "Opportunities",
  description: "Explore volunteering and learning opportunities on Fursa. Connect with organizations and make a difference.",
};

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <Opportunities />
    </Suspense>
  );
}

