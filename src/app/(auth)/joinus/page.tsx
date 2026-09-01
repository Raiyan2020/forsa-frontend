import type { Metadata } from "next";

import JoinUs from "@/features/auth/components/JoinUs";

export const metadata: Metadata = {
  title: "Join Us",
  description:
    "Choose how you want to join Fursa — as an individual volunteer or as an organization.",
};

export default function JoinusPage() {
  return <JoinUs />;
}
