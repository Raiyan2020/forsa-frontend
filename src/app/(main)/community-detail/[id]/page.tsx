import CommunityDetailPage from "@/features/community/components/CommunityDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityDetailPage id={id} />;
}
