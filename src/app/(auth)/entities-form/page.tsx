import type { Metadata } from "next";

import EntitiesRegistrationForm from "@/features/auth/components/EntitiesRegistrationForm";

export const metadata: Metadata = {
  title: "Organization Registration",
  description:
    "Register your organization on Fursa to post volunteer opportunities and events for the community.",
};

export default function EntitiesFormPage() {
  return <EntitiesRegistrationForm />;
}
