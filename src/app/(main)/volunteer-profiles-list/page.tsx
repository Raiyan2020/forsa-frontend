import { Suspense } from "react";
import Loader from "@/components/ui/Loader";
import VolunteerProfilesList from "@/features/profile/components/VolunteerProfilesList";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <VolunteerProfilesList />
    </Suspense>
  );
}
