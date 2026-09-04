import { SessionDetail } from "@/features/session/components/session-detail";

export const metadata = {
  description: "Review an archery session.",
  title: "Session | AthleteHub",
};

export const instant = false;

const SessionDetailPage = async ({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) => {
  const { sessionId } = await params;
  return <SessionDetail sessionId={sessionId} />;
};

export default SessionDetailPage;
