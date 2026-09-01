import { Suspense } from "react";
import Loader from "@/components/ui/Loader";
import dynamic from "next/dynamic";

const PartnerPage = dynamic(
  () => import("@/features/partners/components/Partner"),
  { loading: () => <Loader /> }
);

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <PartnerPage />
    </Suspense>
  );
}
