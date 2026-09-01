import { Suspense } from "react";
import Loader from "@/components/ui/Loader";
import LinkedinCallback from "@/features/auth/components/LinkedinCallback";

/**
 * Legacy alias. New sign-ins land on /linkedin-callback — the path registered in
 * the LinkedIn Developer App — but this keeps in-flight redirects working.
 */
export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <LinkedinCallback />
    </Suspense>
  );
}
