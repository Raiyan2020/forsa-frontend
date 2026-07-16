import MoreProfile from "@/features/profile/components/MoreProfile";
import type { Metadata } from "next";
import { Suspense } from "react";
import Loader from "@/components/ui/Loader";

export const metadata: Metadata = {
  title: "More Profiles",
  description: "Browse volunteer, volunteer team, and organization profiles on Fursa. Connect with volunteers and organizations.",
};

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <MoreProfile />
    </Suspense>
  );
}

