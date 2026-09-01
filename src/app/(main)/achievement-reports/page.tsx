import ProtectedRoute from "@/components/shared/ProtectedRoute";
import AchievementReports from "@/features/achievements/components/AchievementReports";

export default function Page() {
  return (
    <ProtectedRoute userType="volunteer">
      <AchievementReports />
    </ProtectedRoute>
  );
}
