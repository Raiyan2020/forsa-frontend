import ProtectedRoute from "@/components/shared/ProtectedRoute";
import Calendar from "@/features/calendar/components/Calendar";

export default function Page() {
  return (
    <ProtectedRoute userType={["volunteer", "organization"]}>
      <Calendar />
    </ProtectedRoute>
  );
}
