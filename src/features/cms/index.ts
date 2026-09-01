export * from "./components";
export * from "./services/server";
// NOTE: do NOT re-export "./hooks" or the full "./services" here. Both
// `hooks/useHomeCms.ts` and `services/cmsApi.ts` import `lib/api/client.ts`'s
// axios instance (and, transitively, Zustand) — a Server Component that
// imported this barrel would pull that into the RSC graph. `services/server`
// is native-fetch-only and safe. Client code should import `useHomeCms` from
// "@/features/cms/hooks/useHomeCms" and cmsApi functions from
// "@/features/cms/services/cmsApi" directly (as every current caller already
// does — see features/shared/index.ts for the same carve-out on schemas).
