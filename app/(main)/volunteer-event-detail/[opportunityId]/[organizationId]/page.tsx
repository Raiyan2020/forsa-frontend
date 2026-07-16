import VolunteerEvent from "@/features/opportunities/components/VolunteerEvent";

export default async function Page({
  params,
}: {
  params: Promise<{ opportunityId: string; organizationId: string }>;
}) {
  const { opportunityId, organizationId } = await params;
  return (
    <VolunteerEvent
      opportunityId={opportunityId}
      organizationId={organizationId}
    />
  );
}
