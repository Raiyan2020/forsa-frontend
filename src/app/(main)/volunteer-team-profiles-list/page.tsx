import { Suspense } from "react";
import Loader from "@/components/ui/Loader";
import VolunteerteamProfilesList from "@/features/profile/components/VolunteerteamProfilesList";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <VolunteerteamProfilesList />
    </Suspense>
  );
}
