# Opportunity interest tags missing on `/opportunities/{id}/details/` — but not the field you'd expect

Status: **Open — backend bug, blocking. Please retest and reply with a new confirmation doc.**

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
