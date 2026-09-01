import LearnServeDetails from "@/features/opportunities/components/LearnServeDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  return <LearnServeDetails opportunityId={opportunityId} />;
}
