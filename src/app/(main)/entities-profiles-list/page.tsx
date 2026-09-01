import { Suspense } from "react";
import Loader from "@/components/ui/Loader";
import OrganizationProfilesList from "@/features/profile/components/OrganizationProfilesList";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <OrganizationProfilesList />
    </Suspense>
  );
}
