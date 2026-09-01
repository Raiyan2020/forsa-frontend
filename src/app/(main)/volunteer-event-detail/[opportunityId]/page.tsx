import VolunteerEvent from "@/features/opportunities/components/VolunteerEvent";

export default async function Page({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  return <VolunteerEvent opportunityId={opportunityId} />;
}
