import { Suspense } from "react";
import Loader from "@/components/ui/Loader";
import LinkedinCallback from "@/features/auth/components/LinkedinCallback";

/**
 * The redirect URI registered in the LinkedIn Developer App:
 * `${NEXT_PUBLIC_FRONTEND_URL}/linkedin-callback`. `/linkedin/callback` stays
 * around as an alias for sessions started before the paths were unified.
 */
export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <LinkedinCallback />
    </Suspense>
  );
}
