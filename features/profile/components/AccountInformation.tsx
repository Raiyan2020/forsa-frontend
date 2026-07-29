"use client";

import { useAuthStore } from "@/store/authStore";
import OrganizerAccountInformation from "./OrganizerAccountInformation";
import VolunteerAccountInformation from "./VolunteerAccountInformation";

export default function AccountInformation() {
  const userType = useAuthStore((s) => s.user?.user_type);

  return userType === "volunteer" ? (
    <VolunteerAccountInformation />
  ) : (
    <OrganizerAccountInformation />
  );
}
