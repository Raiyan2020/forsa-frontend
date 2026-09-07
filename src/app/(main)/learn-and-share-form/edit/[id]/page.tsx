import ProtectedRoute from "@/components/shared/ProtectedRoute";
import LearnServeForm from "@/features/opportunities/components/LearnServeForm";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedRoute userType={"organization"}>
      <LearnServeForm opportunityId={id} />
    </ProtectedRoute>
  );
}
