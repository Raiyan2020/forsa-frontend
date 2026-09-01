import { Suspense } from "react";
import LearnServeList from "@/features/opportunities/components/LearnServeList";
import Loader from "@/components/ui/Loader";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <LearnServeList />
    </Suspense>
  );
}
