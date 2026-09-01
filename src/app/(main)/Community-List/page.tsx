import { Suspense } from "react";
import Loader from "@/components/ui/Loader";
import CommunityList from "@/features/community/components/CommunityList";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <CommunityList />
    </Suspense>
  );
}
