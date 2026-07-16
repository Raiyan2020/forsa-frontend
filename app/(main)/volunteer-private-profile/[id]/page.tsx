import VolunteerPrivateProfile from "@/features/profile/components/VolunteerPrivateProfile";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VolunteerPrivateProfile id={id} />;
}
