# Opportunity interest tags missing on `/opportunities/{id}/details/` — but not the field you'd expect

Status: **Open — backend's "wrong endpoint" diagnosis doesn't hold up against the actual evidence for id `35`. Please re-verify against this exact id, not a substitute record, before we touch any frontend routing.**

## Second correction — backend's "this is an Event, wrong table" diagnosis doesn't match the evidence for id 35

Backend's latest reply diagnosed this as: opportunity id `35` is actually an **Event** (a separate table from `volunteer_opportunities`), so `/opportunities/35/details/` either 404s or coincidentally hits an unrelated volunteer-opportunity row with the same id — and the fix is for the frontend to call `/events/{id}/` instead whenever the item is an event.

That doesn't match what we actually observed for id `35` specifically:

1. `GET /opportunities/35/details/` returned **`200 OK`** with a full, internally-consistent record — title, dates, description (which itself literally says "٥٠ متطوع" — "50 **volunteers**"), sponsor images, `created_by`, `all_registered_user` — not a 404, and not a mismatched/unrelated record.
2. That same response includes **`"registration_link": "https://joinforsa.net/volunteer-event-detail/35/19"`** — a URL **backend's own system generated and stored on this record**, explicitly pointing at the `volunteer-event-detail` path with this exact id. Backend's own share-link generation for this record treats it as a volunteer opportunity reachable at `/opportunities/35/details/`'s corresponding frontend route.

Backend's confirmation in their reply ("an event with a real 'Charity Work' tag ... plainly 404s") was tested against a **different, substitute record** they picked to illustrate the general architecture point — not against id `35` itself. The general point (three separate tables, don't cross-call) may well be correct as architecture, but it doesn't explain what we actually saw here, and we don't want to go audit/change frontend routing for events based on a diagnosis that doesn't match the reported record.

**Ask:** please re-run this specific case — `GET /opportunities/35/details/` — and reconcile it with your diagnosis: is id `35` a volunteer opportunity or an event? If it's genuinely a volunteer opportunity (which the `200` response and its own `registration_link` both suggest), the original question stands: why are `interests` and `interest_display` both empty on it despite the interest tag visibly having rendered before? If it's genuinely an event that happens to collide with an unrelated volunteer-opportunity id `35`, please explain how that unrelated record's data (dates, description, sponsor images, `registration_link`) came to match "إفطار صائم" so closely — that would itself be worth understanding.

## Important correction to how this was first reported

The original report of this was framed as "`interest_display` is `null`, please bring it back like this list-endpoint example." That's not quite right, and we want to flag that before you dig in:

`interest_display: null` on detail endpoints is **already expected and already handled on our side** — `src/lib/interests.ts` carries this comment from an earlier migration:

> "The detail endpoints now send `interest_display: null` and populate `interests`, while list endpoints still return the old key, so read both and normalise to a single shape."

So the frontend already reads `interests` (the newer `{ id, name_en, name_ar, interest_type }` shape) as the primary source for detail endpoints, falling back to `interest_display` only for endpoints still on the old shape. **Please don't re-add `interest_display` to detail endpoints** — that would be undoing an intentional migration.

## The actual bug

`GET /opportunities/35/details/` returns **both** fields empty:
```json
"interests": [],
"interest_display": null,
```

But this same opportunity ("إفطار صائم" — a Ramadan charity meal-distribution event) visibly had the **"Charity Work" / "أعمال خيرية"** interest tag attached and rendering correctly on `/volunteer-event-detail/35` (screenshot attached to the original report — the tag pill + label icon at `VolunteerEvent.tsx:1554-1581`, which only renders when `interestTags.length > 0`, so it could not have shown that tag from empty data).

So: the tag existed and rendered before, and now neither `interests` nor `interest_display` carries it on this detail endpoint. This isn't "an opportunity with no interests set" — it's data that appears to have gone missing from the response for this specific record (and per initial report, other opportunities as well, not just #35).

## Ask for backend

1. Please check why `interests` (the current, correct field on detail endpoints) is empty for opportunity `35` despite it having an interest tag assigned — is the relation not being eager-loaded/serialized on `OpportunityController::show` (or equivalent), or has the underlying tag assignment actually been lost/detached from the record?
2. Please check whether this is isolated to opportunity `35` or affects other opportunities broadly, as originally suspected — a quick count of opportunities with a non-empty `interests` value on `/opportunities/{id}/details/` vs. on the list endpoint for the same records would confirm scope.
3. Once fixed, please send back a confirmation doc showing `GET /opportunities/35/details/` (or another affected id) returning `interests` populated with its assigned tag(s), in the `{ id, name_en, name_ar, interest_type }` shape.

No frontend changes made — `normalizeInterests()` already reads `interests` first and falls back to `interest_display`; there's nothing to adjust there until the underlying data/relation is fixed.
