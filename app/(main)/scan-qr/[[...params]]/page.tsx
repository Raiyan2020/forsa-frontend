import { Suspense } from "react";
import Loader from "@/components/ui/Loader";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import ScanQR from "@/features/profile/components/ScanQR";

export default async function Page({
  params,
}: {
  params: Promise<{ params?: string[] }>;
}) {
  const { params: routeParams } = await params;
  const opportunityId = routeParams?.[0];
  const eventId = routeParams?.[1];
  return (
    <ProtectedRoute userType={["volunteer", "organization"]}>
      <Suspense fallback={<Loader />}>
        <ScanQR opportunityId={opportunityId} eventId={eventId} />
      </Suspense>
    </ProtectedRoute>
  );
}
