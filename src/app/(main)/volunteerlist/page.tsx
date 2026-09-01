import ProtectedRoute from "@/components/shared/ProtectedRoute";
import VolunteerList from "@/features/opportunities/components/VolunteerList";

export default function Page() {
  return (
    <ProtectedRoute userType={["volunteer", "organization"]}>
      <VolunteerList />
    </ProtectedRoute>
  );
}
