import EventDetails from "@/features/events/components/EventDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return <EventDetails eventId={eventId} />;
}
