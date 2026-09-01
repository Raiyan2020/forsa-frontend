# Fursa-Next Architecture Migration Plan

Status: **proposed, not yet approved for execution.** This document is the analysis-only deliverable requested before any refactor work begins. Nothing described here has been implemented.

Reference architecture: `featuerd-base-codebase-main/` (architecture pattern only — never copy its business logic, never modify it).
Functional source of truth: `fursa_frontend/` (used only to confirm no behavior is lost — never restructure it, never treat its architecture as the target).
Target of all changes: `fursa-next/` only.

All paths below are relative to `fursa-next/src/` unless stated otherwise (the app root is `fursa-next/src/`, not `fursa-next/`).

---

## 1. Reference Architecture (`featuerd-base-codebase-main`)

This is a starter scaffold, not a finished product — some of it is boilerplate/demo code or an outright repo defect, not a convention to copy. Real pattern vs. defect is separated below.

**The one strong, consistently-applied convention**: every feature under `src/features/<name>/` has the same shape, and every level has a barrel file:

```
features/<name>/
├── components/
│   ├── index.ts        # export { X } from './X'
│   └── X.tsx
├── hooks/
│   ├── index.ts
│   └── useX.ts
├── services/
│   ├── index.ts
│   └── x.ts             # e.g. ProjectService = { getX, create, update }
├── types/
│   ├── index.ts
│   └── x.types.ts
└── index.ts              # export * from './components' | './hooks' | './services' | './types'
```

`features/projectsFeatExample/index.ts` states the import discipline explicitly:

```ts
// ✅ import { ProjectDemo } from '@/features/projects';
// ❌ import { ProjectDemo } from '@/features/projects/components/ProjectDemo';
```

That is the architectural idea worth porting: **a feature's internals are private; only its root `index.ts` is a valid import target for other code.**

| Layer | Pattern |
|---|---|
| App Router | `app/[locale]/(group)/page.tsx` files are thin (login page is 7 lines); all logic lives in `features/`. Two route groups: `(auth)` bare, `(main)` with Navbar/Footer layout. |
| Global vs shared vs feature components | `components/ui/` = shadcn primitives (global, dumb). `features/shared/components/` = cross-feature composites (Modal, Tabs, EmptyState, the `forms/` Zod+RHF system). Feature-owned components live inside their feature, exported only via its `index.ts`. |
| Services/API | `lib/apiServiceCall.tsx` — one isomorphic axios wrapper (branches on `typeof window`). Each feature's `services/*.ts` declares only its own endpoint functions on top of that shared wrapper. No single giant endpoint file. |
| Hooks | `features/shared/hooks/useAppQuery.ts` / `useAppMutation.tsx` wrap React Query with auth headers + toast-on-error baked in. Every feature hook is a thin wrapper: shared hook + feature service call. |
| Types | Per-feature in `types/*.types.ts`. Cross-cutting types in `features/shared/types/` (flat files, imported by direct subpath — one of the two places the barrel discipline breaks). |
| Schemas | Zod + React Hook Form. `features/shared/schemas/fields/fields.ts` exports `createFields(t)` — i18n-aware Zod field factories (email, password, dates) that per-form schemas compose via `z.object({...fields})`. |
| State | No Redux/Zustand at all. Auth/session via NextAuth (`useSession`). All remote data via React Query. Local UI state is plain `useState`. |
| Data fetching | No ISR usage anywhere found — leans entirely on React Query caching. Not a pattern to inherit; doesn't demonstrate Next's server-fetch caching. |
| Auth/middleware | NextAuth v4 + `src/proxy.ts` (next-intl's locale middleware, not auth-gating). |
| Providers | `providers/providers.tsx`: `PhotoProvider → DirectionProvider → QueryClientProvider`, composed in root layout. |
| Naming/loading/error | Genuinely inconsistent (kebab vs camelCase hooks, mixed type-file naming) and **no `loading.tsx`/`error.tsx`/`not-found.tsx` anywhere** — a gap in the reference itself, not a convention to inherit. |

**Repo defects explicitly not to replicate**: duplicate `global.ts` / `global copy.ts` type files with diverging imports; duplicate `components/ui/button.tsx` vs `button/index.tsx` with different prop shapes; two parallel form-input systems (`formInputs/` legacy vs `forms/` current); `home`/`posts` features are copy-pasted mock scaffolding, not two genuine domain examples.

---

## 2. Current Fursa-Next Architecture

All paths corrected to include the real `src/` root.

| Layer | Current state |
|---|---|
| App Router | 69 `page.tsx` across `src/app/(auth)/` and `src/app/(main)/`. Vast majority thin. **Three outliers**: `src/app/(auth)/entities-form/page.tsx` (589 lines), `src/app/(auth)/individual-form/page.tsx` (745 lines), `src/app/(auth)/joinus/page.tsx` — full Formik forms and OAuth wiring inline in the route file, bypassing `features/auth/`. |
| Feature structure | 15 folders under `src/features/`, structurally inconsistent. Almost all have only `components/`. `features/auth` alone has `api/`. `features/cms` alone has `hooks/`. `features/services` has no components — it's just the 791-line `api.ts`. `features/shared` has exactly one file (`NotFound.tsx`). No feature has `types/` or `schemas/`. No barrel files exist anywhere in the repo. |
| Shared components | `src/components/ui/` (32 primitives) and `src/components/shared/` (11 cross-cutting widgets) are the correct top-level split — already matches the reference's `components/ui` vs `features/shared/components` idea. But three confirmed live duplications: `features/home/components/Title.tsx` forks `components/shared/Title.tsx` (dead, 0 importers); `features/info/components/ModalInput.tsx`/`ModalTextarea.tsx` fork `components/ui/`'s versions, used only by `ContactUs.tsx`, silently diverging (missing `digitsOnly`/`lettersOnly`/`endAdornment`). |
| API layer | `src/lib/api/client.ts` (axios, client-side) vs `src/lib/api/server.ts` (native `fetch` + ISR, server-only, no Zustand/axios imports) — this split is deliberate and documented as the single most important structural rule in the app. **Must not change.** The actual problem is one layer above: `src/features/services/api.ts` is a single 791-line, flat, comment-banner-grouped file of ~130 endpoint wrappers, almost all typed `any`, touched by every feature. |
| Providers | `src/providers/providers.tsx`, `src/providers/i18n.tsx`, `src/providers/query.tsx` — a dedicated top-level `providers/` folder, already structurally aligned with the reference's `providers/providers.tsx`. (Note: CLAUDE.md references `lib/i18n/provider.tsx` and `lib/query/provider.tsx`; those are stale — `src/lib/i18n/` only contains `config.ts`, and `src/lib/query/` doesn't exist. The real provider components live in `src/providers/`.) |
| Types | No per-feature `types/`. Scattered across `lib/api/types.ts` (barely used, 35 lines), `lib/api/server.ts` (~10 interfaces, only for server-fetched homepage/CMS data), inline in 103 feature component files, and `any` almost everywhere in `api.ts`. |
| Hooks | Only `features/cms/hooks/useHomeCms.ts` exists. Every other feature hand-rolls `useQuery`/`useMutation` inline per component with locally-scoped query keys — no shared query-hook layer, no `queryKeys` registry. |
| Schemas | `lib/schema.ts` (313 lines) is a real, well-built Yup helper library (`createSchema`, `YupRequiredString`, `YupStrongPassword`, `YupPhoneNumber`, `YupDateOfBirth`, all i18n-aware) — but 27 files build ad hoc `Yup.object().shape({...})` inline, mixing raw Yup calls with the helpers rather than composing through `createSchema` consistently. |
| State | 6 Zustand stores in `src/store/`. `authStore`/`languageStore` are genuinely global (correctly top-level). `roleModalStore`/`timeSlotsStore` are single-feature-owned (opportunities/events) but live at the same top level as the global ones. `uiStore.ts` is dead code — re-implements both of the above with incompatible field names, zero importers anywhere. `timeSlotsStore.ts` imports its `TimeSlot` type from a component file, an inverted dependency. |
| Constants | `src/data/` sits as a sibling to `lib/`, functionally a constants folder, inconsistently placed. |
| Route-level conventions | No `loading.tsx`/`error.tsx` anywhere. `not-found` is handled three separate ways (`app/not-found.tsx`, `app/(main)/not-found.tsx`, `app/(main)/404/page.tsx`) all rendering the same component. Byte-identical duplicate route: `event-thankyou` vs `event-thankyoupage`. One PascalCase route folder (`Community-List/`) among otherwise-kebab-case routes. One typo'd route (`leran-share-register-list`). |

---

## 3. Architecture Gap

| Dimension | Reference | Fursa-next today | Gap |
|---|---|---|---|
| Feature internal shape | Fixed: `components/hooks/services/types` + barrel | Ad hoc, no two features alike | Largest structural gap |
| Import boundary | Only feature-root `index.ts` is public | No barrels at all; any file importable from anywhere | No enforced boundary → the exact duplication bugs Fursa already has (Title, ModalInput) |
| API endpoint ownership | Per-feature `services/*.ts` | One 791-line flat file for all features | Needs splitting; underlying client/server split stays untouched |
| Types | Per-feature `types/` | Scattered 4 ways, mostly `any` | Needs a home per feature; global envelope stays in `lib/api/types.ts` |
| Query hooks | Shared `useAppQuery`/`useAppMutation` + thin per-feature wrappers | Only `cms` has any hook; rest inline `useQuery` | Needs the per-feature `hooks/` layer; the shape transfers, not the wrapper internals (Fursa's client/server axios split differs from the reference's isomorphic wrapper) |
| State management | None (NextAuth + React Query only) | 6 Zustand stores | Not a gap to close — Fursa's token-based auth via axios interceptor is real, working, documented. Only fix: dead code + misplaced ownership, not the tool choice. |
| Schemas | Zod factories composed per form | Yup helpers exist but inconsistently used | Same idea, different library — keep Yup (CLAUDE.md: Formik+Yup is standard; RHF/Zod are unused deps, not to be activated) |
| Route-level loading/error/not-found | Also absent in reference | Absent, plus a triple not-found and a duplicate route | Not inherited from the reference (it lacks this too) — a Fursa-only cleanup, lower priority |
| Auth mechanism | NextAuth | Custom token + Zustand + axios interceptor | Explicitly not to be touched — different domain requirement, not an architecture smell |

---

## 4. Target Fursa-Next Structure

```
fursa-next/src/
├── app/                              # unchanged: route groups, thin pages only
│   ├── (auth)/
│   └── (main)/
├── components/
│   ├── layout/                       # Header.tsx, Footer.tsx (unchanged)
│   ├── shared/                       # cross-cutting client widgets (unchanged, + NotFound.tsx merged in)
│   └── ui/                           # primitives (unchanged, deduped)
├── constants/                        # was data/ — Constants.ts, countryLabels.ts, orgTypes.ts
├── features/
│   ├── about/
│   ├── achievements/
│   ├── auth/
│   ├── calendar/
│   ├── cms/
│   ├── community/
│   ├── events/
│   ├── home/
│   ├── info/
│   ├── notification/
│   ├── opportunities/
│   ├── partners/
│   ├── profile/
│   └── <each feature, same shape>/
│       ├── components/
│       │   └── index.ts
│       ├── hooks/                    # extracted useQuery/useMutation wrappers
│       │   └── index.ts
│       ├── services/                 # this feature's slice of the old api.ts
│       │   └── index.ts
│       ├── types/                    # this feature's request/response types
│       │   └── index.ts
│       ├── schemas/                  # only where the feature has forms
│       │   └── index.ts
│       ├── store/                    # only where state is feature-owned (opportunities/, events/)
│       │   └── index.ts
│       └── index.ts                  # barrel — the only valid import path from outside
├── lib/
│   ├── api/
│   │   ├── client.ts                 # unchanged — the axios instance
│   │   ├── server.ts                 # unchanged — fetch()+ISR, no zustand/axios
│   │   ├── types.ts                  # generic envelope only (ApiResponse/ApiPagination/ApiResponseStatus)
│   │   ├── errors.ts                 # unchanged
│   │   ├── config.ts                 # unchanged
│   │   └── cms.ts                    # unchanged
│   ├── auth/                         # unchanged (linkedin.ts, socialSignup.ts)
│   ├── i18n/                         # unchanged (config.ts)
│   ├── schema.ts                     # unchanged — shared Yup field-builder library
│   ├── helpers.ts                    # unchanged, generic-only (domain helpers move out, see mapping)
│   └── navigationState.ts, phoneRules.ts, sanitizeHtml.ts   # unchanged
├── providers/                        # unchanged (providers.tsx, i18n.tsx, query.tsx)
├── locales/                          # unchanged
└── store/                            # only genuinely global state
    ├── authStore.ts
    ├── languageStore.ts
    └── notificationStore.ts
```

Two structural rules carried over from the reference, adapted:

1. **Feature-root `index.ts` is the only valid import path** for anything under `features/<name>/`. `app/` and other features import `@/features/opportunities`, never `@/features/opportunities/components/X`.
2. **A feature owns its slice of the API, its types, and (if applicable) its state and schemas.** `lib/api/client.ts` and `server.ts` stay exactly as they are — infrastructure, not a feature — but the 791-line endpoint file and the scattered types above them get distributed to their owning features.

---

## 5. Migration Mapping

| Current | Target | Reason |
|---|---|---|
| `features/services/api.ts` (791 lines, all endpoints) | Split into `features/<name>/services/index.ts` per feature, each still calling `apiClient` from `lib/api/client.ts` | Matches reference's per-feature service ownership; removes the single blast-radius file. Client/server axios boundary untouched. |
| Inline `interface`/`type` in 103 feature component files | `features/<name>/types/index.ts` | Reference's per-feature types pattern. |
| `lib/api/server.ts`'s ~10 response interfaces (`HomeOpportunity`, `HomeEvent`, `CommunityPost`, etc.) | Move to owning feature's `types/` (`features/home/types`, `features/cms/types`), imported back into `server.ts` | Types are erased at compile time — importing them into `server.ts` doesn't violate its "no Zustand/axios" rule. |
| `lib/api/types.ts`'s stray `FaqItem` | `features/info/types` | Domain type, not part of the generic envelope. |
| Inline `useQuery`/`useMutation` calls scattered across `Opportunities.tsx`, `Events.tsx`, `CommunityList.tsx`, etc. | `features/<name>/hooks/index.ts`, following the existing `useHomeCms.ts` pattern | Only `cms` currently has this layer. |
| Ad hoc `Yup.object().shape({...})` inline in `entities-form/page.tsx`, `individual-form/page.tsx`, and ~25 other files | `features/<name>/schemas/index.ts`, composed from `lib/schema.ts` helpers via `createSchema()` | Mirrors the reference's shared-field-factory + per-form composition idea; keeps Yup, not Zod. |
| `data/Constants.ts`, `data/countryLabels.ts`, `data/orgTypes.ts` | `constants/` (top-level, sibling to `lib/`) | Currently an unexplained sibling to `lib/`. |
| `lib/checkInWindow.ts`, `lib/opportunityButtonState.ts` | `features/opportunities/utils/` | Opportunity-domain logic, not generic helpers. |
| `store/roleModalStore.ts` | `features/opportunities/store/index.ts` | Feature-owned state. |
| `store/timeSlotsStore.ts` | `features/events/store/index.ts`, with `TimeSlot` type moved to `features/events/types` | Also fixes the current inverted store→component type dependency. |
| `store/uiStore.ts` | **Delete.** Zero importers, incompatible field names vs. the two stores it duplicates. | Confirmed dead code. |
| `store/authStore.ts`, `store/languageStore.ts`, `store/notificationStore.ts` | Stay at top-level `store/` | Genuinely global, correctly placed already. |
| `features/home/components/Title.tsx` | **Delete.** Zero importers; every real usage already imports `components/shared/Title.tsx`. | Dead duplicate. |
| `features/info/components/ModalInput.tsx`, `ModalTextarea.tsx` | **Delete**; repoint `ContactUs.tsx` to `components/ui/ModalInput`/`ModalTextarea` | Live duplicate that has started diverging from the shared version. |
| `features/shared/` (currently just `NotFound.tsx`) | Merge into `components/shared/NotFound.tsx`; remove the now-empty `features/shared/` folder | A single-file feature folder isn't a feature. |
| `entities-form/page.tsx` (589L), `individual-form/page.tsx` (745L) | Extract into `features/auth/components/EntitiesForm.tsx`, `IndividualForm.tsx`; `page.tsx` becomes a thin delegator | Matches the pattern every other auth screen already follows. |
| `joinus/page.tsx` | Extract into `features/auth/components/JoinUs.tsx` | No feature counterpart currently exists for it. |
| `app/(main)/event-thankyou/` and `event-thankyoupage/` | Confirm neither is linked externally (CMS content, emails, deep links), then collapse to one route + redirect for the other | Byte-identical duplicate; **flagged for explicit confirmation before removal** — URL-affecting. |
| `app/(main)/Community-List/`, `.../leran-share-register-list/` | Rename to `community-list/`, `learn-share-register-list/` + redirects | Naming/typo fixes; also URL-affecting, same caveat. |
| `app/not-found.tsx`, `app/(main)/not-found.tsx`, `app/(main)/404/page.tsx` | Keep the two Next.js-convention `not-found.tsx` files; remove the redundant `/404` route page, or make it a redirect to `/` | Three mechanisms for one behavior; a Fursa-specific gap, not reference-driven. |

---

## 6. Migration Plan (phased, each phase independently verifiable)

**Phase 0 — Dead-code and duplicate cleanup (no structural change)**
Delete `store/uiStore.ts`, `features/home/components/Title.tsx`, `features/info/components/ModalInput.tsx`/`ModalTextarea.tsx` (repoint `ContactUs.tsx`). Verify: `npx tsc --noEmit`, `npm run lint`, grep confirms zero remaining references, manual load of `/contact-us`.

**Phase 1 — Pilot the feature-module shape on one feature**
Pick `features/cms` (smallest, already has a `hooks/` folder, low blast radius, only ~2-3 consumers). Add `types/`, `services/`, barrel `index.ts` per subfolder and at the feature root. Repoint consumers to import from `@/features/cms` instead of subpaths. Verify: `npx tsc --noEmit`, `npm run lint`, load homepage + `/pages/[slug]` + `/about-us`/`/faq` (all cms-dependent).

**Phase 2 — Split `features/services/api.ts` by feature, one feature at a time**
For each of the 15 features (smallest first — `notification`, `partners`, `achievements` before `opportunities`), move its slice of the 791-line file into `features/<name>/services/index.ts`, still calling the same `apiClient`. Update call sites. Verify per feature: `npx tsc --noEmit`, `npm run lint`, manually exercise that feature's main screens. Do not proceed to the next feature until the current one builds and loads cleanly.

**Phase 3 — Extract inline types per feature**
Alongside (or immediately after) each feature's Phase 2 pass, pull that feature's inline `interface`/`type` declarations into `features/<name>/types/index.ts`. Move `lib/api/server.ts`'s home/cms response interfaces into `features/home/types` and `features/cms/types`, imported back into `server.ts`. Verify: `npx tsc --noEmit` after each feature.

**Phase 4 — Extract query/mutation hooks per feature**
Following the `useHomeCms.ts` model, wrap each feature's `useQuery`/`useMutation` calls in `features/<name>/hooks/index.ts`. Verify: `npx tsc --noEmit`, `npm run lint`, manual smoke test of that feature.

**Phase 5 — State ownership fixes**
Move `roleModalStore.ts` → `features/opportunities/store/`, `timeSlotsStore.ts` → `features/events/store/` (fix its `TimeSlot` type source in the same move). Verify: `npx tsc --noEmit`, manually exercise volunteer role modal + event time-slot flows (`LearnServeForm`, `EventTimeSlotModal`, `EventCreateTimingModal`, `VolunteerRoleModal`, `VolunteerList`).

**Phase 6 — Schema consolidation**
For features with forms (auth, opportunities, events, profile, info), move ad hoc inline Yup schemas into `features/<name>/schemas/index.ts`, composed via `lib/schema.ts`'s `createSchema()` and existing helpers. Verify: `npx tsc --noEmit`, `npm run lint`, submit each migrated form with valid and invalid input to confirm validation messages are unchanged.

**Phase 7 — Business logic out of `app/`**
Extract `entities-form/page.tsx`, `individual-form/page.tsx`, `joinus/page.tsx` into `features/auth/components/`, leaving thin route delegators. Highest-risk phase (largest files, OAuth wiring, DOB logic) — do it last, in isolation, with a full manual pass through signup for all three user types (individual, organization, volunteer) plus Google/LinkedIn OAuth.

**Phase 8 — Housekeeping (constants, dead lib helpers, route naming)**
Move `data/` → `constants/`; move `checkInWindow.ts`/`opportunityButtonState.ts` into `features/opportunities/utils/`; consolidate the triple not-found handling. Route renames (`Community-List`, `leran-share-register-list`, `event-thankyoupage`) go last and only after confirming none of these URLs are referenced from CMS content, emails, or external links — **needs explicit sign-off before execution**, unlike everything else in this plan.

**Phase 9 — Final consistency pass**
Full-repo `npx tsc --noEmit` + `npm run lint` + a manual pass through the primary user journeys (signup all 3 types, login, browse/apply to an opportunity, event registration, profile edit, CMS pages, admin-editable content rendering) to confirm nothing regressed across the whole migration.

---

## Execution notes

- Nothing in this document has been executed. Each phase should only start after the previous one is confirmed stable (build + lint + manual check).
- Phase 8's route renames are the only items in this plan that change user-facing URLs; everything else is internal reorganization with no behavior change.
- `lib/api/client.ts`, `lib/api/server.ts`, and the client/server API boundary they enforce are never touched by this plan.
