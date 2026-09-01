import type { Metadata } from "next";

import IndividualRegistrationForm from "@/features/auth/components/IndividualRegistrationForm";

export const metadata: Metadata = {
  title: "Individual Registration",
  description:
    "Create an individual volunteer account on Fursa and start participating in volunteer opportunities and events.",
};

export default function IndividualFormPage() {
  return <IndividualRegistrationForm />;
}
