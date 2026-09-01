import ProtectedRoute from "@/components/shared/ProtectedRoute";
import ScanPermission from "@/features/opportunities/components/ScanPermission";

export default function Page() {
  return (
    <ProtectedRoute userType={["volunteer", "organization"]}>
      <ScanPermission />
    </ProtectedRoute>
  );
}
