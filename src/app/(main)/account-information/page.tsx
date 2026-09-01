import ProtectedRoute from "@/components/shared/ProtectedRoute";
import AccountInformation from "@/features/profile/components/AccountInformation";

export default function Page() {
  return (
    <ProtectedRoute userType={["volunteer", "organization"]}>
      <AccountInformation />
    </ProtectedRoute>
  );
}
