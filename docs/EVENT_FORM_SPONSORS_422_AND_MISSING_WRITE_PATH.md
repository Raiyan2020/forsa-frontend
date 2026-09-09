# Event form sponsors: 422 "unknown field" on every create/update, and no API write path for event sponsors at all

Status: **frontend blocker resolved (2026-09-08) — backend decision + endpoints still needed.**

## The reported failure

Creating an event from `/event-form` (`POST /api/events/`) returns 422 for every submission, sponsor picked or not:

Request (multipart, trimmed):

```
title_ar=Enim cupiditate et q
title_en=Dolor amet rem illu
...
images[]=(binary)
event_sponsor_images_position_1=1
```

Response:

```json
{
    "key": "fail",
    "msg": "خطأ في التحقق من البيانات",
    "code": 422,
    "response_status": {
        "error": true,
        "validation_errors": {
            "event_sponsor_images_position_1": ["هذه النقطة لا تقبل هذا الحقل. راجع اسم الحقل."]
        }
    }
}
```

Note the payload carries `event_sponsor_images_position_1` **without** `event_sponsor_images_organization_1` — the form's default sponsor row is `{ sponsorId: "", position: 1 }` (`EventForm.tsx` initialValues), and the old submit handler appended `event_sponsor_images_position_{n}` unconditionally. So this was not a "user picked a sponsor wrong" edge case: **every event create/update from `/event-form` was rejected.**

## Root cause (frontend side — fixed)

`src/features/events/components/EventForm.tsx` submitted sponsors inline as:

```
event_sponsor_images_organization_{n}
event_sponsor_images_position_{n}
```

That contract does not exist on this backend generation:

- `EventController::validateEventPayload()` (`fursa_backend/app/Http/Controllers/Api/Event/EventController.php:339`) has no sponsor rules; its `rejectUnknownWriteKeys()` allowlist (line 381) is `['interest_ids', 'images', 'sponsor_images', 'license_image', 'existing_image_ids']` plus the rules — neither sponsor key is in it.
- `RejectsUnknownWriteKeys` (`app/Http/Controllers/Api/Concerns/RejectsUnknownWriteKeys.php`) is the deliberate BE-15/BE-18/BE-22 guard that turns silently-dropped unknown keys into this exact 422. It did its job.
- The only event-sponsor write path the backend implements is `sponsor_images[]` **files** in `syncEventRelations()` (line 403): `EventSponsorImage::create(['event_id' => …, 'image' => …])` — organization/position are never written.

**Frontend fix applied:** the inline appends were removed from `EventForm.tsx` (comment left in place pointing at this doc). Event create/update now succeeds, and existing `event_sponsor_images` rows are untouched on update (`syncEventRelations` only ever adds file rows).

## The remaining gap (backend side — needs a decision)

The event sponsor feature is half-built on both sides and currently has **no way to persist a sponsor's organization or position through the API**:

| Layer | State |
|---|---|
| DB | `event_sponsor_images` has nullable `organization_id` (FK → `organization_profiles`) and `position` columns (`2024_01_01_000004_create_event_tables.php:72`) |
| API write | Only `sponsor_images[]` files → rows with image only; no org, no position; no dedicated attach/detach endpoints |
| API read | `WebsiteEventResource` (line 129) returns `{ id, image, position }` and uses `organization_id` internally for the viewer's `sponsor` relationship tag |
| Frontend form | Sponsor picker collects `{ organization, position }` rows (same UX as the opportunity forms) — currently cannot save anything |
| Frontend details | `EventDetails.tsx` renders `event_sponsor_images` position-ordered logos |

For comparison, volunteer/learn-serve opportunities attach sponsors through dedicated endpoints with eligible-org validation:

```
POST   /api/volunteer-opportunities/{id}/sponsors/    { "organization_id": 12 }
DELETE /api/volunteer-opportunities/{id}/sponsors/{sponsorId}/
POST   /api/learn-serve-opportunities/{id}/sponsors/  { "organization_id": 12 }
DELETE /api/learn-serve-opportunities/{id}/sponsors/{sponsorId}/
```

(`HandlesOpportunitySponsors` trait — validates `organization_id` against approved, non-Volunteer-Team organizations and rejects duplicates.)

## Ask for backend

1. Add the matching pair for events, mirroring the opportunity endpoints:

   ```
   POST   /api/events/{id}/sponsors/    { "organization_id": 12, "position": 1? }
   DELETE /api/events/{id}/sponsors/{sponsorId}/
   ```

   Same eligibility rules (`HandlesOpportunitySponsors::sponsorEligibleOrganizationsQuery`), same duplicate check. Please confirm whether `position` should be accepted here too — the event form collects it, the DB column exists, and the details payload returns it — opportunities' `attachSponsor` currently ignores it.

2. Or, alternatively, accept the inline `event_sponsor_images_organization_{n}` / `event_sponsor_images_position_{n}` keys on `POST /events/` / `PUT /events/{id}/` (they would need adding to the `rejectUnknownWriteKeys` allowlist — e.g. as `event_sponsor_images_*` patterns in `ALLOWED_PATTERNS`) and wire org/position into `syncEventRelations()`. Note the opportunities backend dropped inline support in favour of the dedicated endpoints (`VolunteerOpportunityController` allowlist has no sponsor keys either), so option 1 keeps the two mechanisms consistent.

3. While the gap stands, confirm that `POST /events/` / `PUT /events/{id}/` **without** any sponsor keys leaves existing `event_sponsor_images` rows untouched (it does today — `syncEventRelations` never deletes) — the frontend relies on that for edit mode.

## Frontend follow-up (once endpoints land)

Wire the event form's picker to sync after create/update exactly like the opportunity flow does today (`syncOpportunitySponsors` in `src/features/opportunities/services/opportunities.ts:39`): diff the picked sponsors against `event_sponsor_images[].id` and issue one attach per new org and one delete per removed relation id, then refetch.
