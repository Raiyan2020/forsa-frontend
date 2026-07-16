import ReplyDetailPage from "@/features/community/components/ReplyDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string; replyId: string }>;
}) {
  const { postId, replyId } = await params;
  return <ReplyDetailPage postId={postId} replyId={replyId} />;
}
