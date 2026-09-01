import VerifyReport from "@/features/achievements/components/VerifyReport";

export default async function Page({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <VerifyReport uuid={uuid} />;
}
