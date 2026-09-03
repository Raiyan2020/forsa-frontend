# Certificates not appearing after an opportunity ends — please confirm the issuance cycle is working, and document it for us

Status: **ANSWERED — not a bug, and not a timing issue.** Backend confirmed certificates only exist for `learn_serve_opportunity` (manual `POST /certificates/{registration_id}/` + a daily `03:30` `fursa:backfill-missing-certificates` cron, gated on `is_attended` + a `certificate_type`/`learning_type` eligibility match). `volunteer_opportunity` and `event` have no certificate mechanism at all — no columns, no model, no route — so "Reeest" (a `volunteer_opportunity`) will never produce a certificate under the current system, regardless of how long it's been since it ended. Not gated on `preparation_valid_until_at`/`is_preparation_window_closed` as guessed in this doc's original hypothesis — those fields are unrelated to certificate generation. Backend reproduced the pipeline end-to-end for an eligible Learn&Serve registration to confirm it isn't stuck. No frontend changes made: `GET /user-certificates/` already renders correctly as empty for this user, which is the accurate state. Backend flagged that surfacing a "pending vs. not eligible" distinction on the certificates tab would need a product decision on what "pending" should even mean for a `volunteer_opportunity` — not picked up here, left for a future ask if wanted.

## What we're seeing

`/volunteer-profile` for the logged-in volunteer ("Ahmed Abdullah") shows:
- Stats: **2** فرصة تطوع (completed opportunities), **23** ساعة تطوع (volunteer hours logged), **0** شهادة (certificates).
- The "الفرص" (Opportunities) tab lists the opportunity **"Reeest"** with the **"انتهت" (Ended)** badge — it ran `2026-08-29` → `2026-08-31`.
- The "الشهادات" (Certificates) tab is empty.

The frontend certificates tab (`ProfileDescriptionTabs.tsx` → `CertificateTabs`) just renders whatever `GET /user-certificates/?user_id={id}` returns — an empty array renders the empty state shown above, so this isn't a frontend rendering bug; the endpoint is genuinely returning nothing for this user.

## A plausible reason — please confirm either way

This same opportunity ("Reeest", id `113`) came up earlier in `docs/OPPORTUNITY_STATUS_STALE_BUG.md`. Its `GET /opportunities/113/details/` response at the time showed:
```
"end_date": "2026-08-31",
"preparation_valid_until_at": "2026-09-03T23:59:59+00:00",
"is_preparation_window_closed": false
```
If certificate generation is (correctly) gated on the attendance/check-in window closing — i.e. volunteers can still be marked present up to `preparation_valid_until_at`, so a certificate can't be finalized before that — then **not** having a certificate yet, as of today, may be entirely expected, and simply resolves itself once that window closes and attendance is final.

We don't know whether that's actually how it works, though — hence this doc rather than a bug report.

## Ask for backend

1. Please confirm whether certificate generation is tied to the attendance/check-in window closing (`preparation_valid_until_at` / `is_preparation_window_closed`), a separate scheduled job, or something else entirely.
2. Please double-check the automated cycle is actually running end-to-end right now for opportunity `113` / user `690` (or whichever internal ids these map to) — confirm a certificate does get generated once whatever the real trigger condition is has been met, so we know the pipeline itself isn't stuck.
3. Please send back a short business-analysis doc answering, for our reference:
   - What triggers certificate generation for a volunteer opportunity (event, cron/scheduled job, manual organizer action, etc.)?
   - What has to be true first (attendance finalized? check-in window closed? organizer approval?) — and how long after an opportunity ends should a volunteer realistically expect to see their certificate?
   - Does anything about it differ for `learn_serve_opportunity` / events vs. `volunteer_opportunity`?
   - Is there a status/flag we could surface in the API response (e.g. "certificate pending" vs. "not eligible") so the frontend can show the volunteer something more informative than an empty tab while it's still pending?

No frontend changes made — the certificates tab already displays exactly what this endpoint returns; there's nothing to fix here until we understand the intended timing.
