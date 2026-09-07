# Opportunity interest tags missing on `/opportunities/{id}/details/` — but not the field you'd expect

Status: **Open — and no longer about one record. As of 2026-09-06 *every* opportunity, learn-serve opportunity and event on the API returns empty interests, on both the detail and list endpoints. The old backend returned them populated for the same opportunity. Read the 2026-09-06 update first; the id-`35` argument below is now history.**

## Update 2026-09-06 — this is platform-wide, and the old backend has the data

The same opportunity exists on both backends: **#98 on the old API** and **#97 on the new Laravel API** — same organizer (user `905`, "omniya"), same Arabic title ("مسابقة أمنية مدرستك الرابعة"), same description, same dates (2026-09-17 → 2026-09-30), same `total_roles`.

Old API response for **#98**:

```json
"interest_display": [
  { "id": 71, "choice_type": "volunteer_opportunity_interest", "value_en": "Community Service", "value_ar": "خدمة مجتمعية" },
  { "id": 74, "choice_type": "volunteer_opportunity_interest", "value_en": "Event Management & Organization", "value_ar": "تنظيم واداره الفعاليات" },
  { "id": 80, "choice_type": "volunteer_opportunity_interest", "value_en": "Environment", "value_ar": "البيئة" }
]
```

New API response for **#97**:

```json
"interests": [],
"interest_display": null
```

So the tags are not "unset by the organizer" — this record demonstrably had three of them, and the copy of it on the new backend has none.

### Scope, checked live on `https://portal.fursa.raiyan.cc/api` (2026-09-06, unauthenticated)

| Request | `interests` | `interest_display` |
|---|---|---|
| `GET /opportunities/97/details/` | `[]` | `null` |
| `GET /opportunities/98/details/` | `[]` | `null` |
| `GET /opportunities/124/details/` | `[]` | `null` |
| `GET /opportunities/35/details/` | `[]` | `null` |
| `GET /learn-serve-opportunities/24/` | `[]` | `null` |
| `GET /events/1/` | `[]` | `[]` |
| `GET /list-volunteer-opportunities/?per_page=100` | — | `[]` on **all 20** rows |

Not one record, not one endpoint: **no opportunity, learn-serve opportunity or event anywhere on the API currently carries a single interest tag.** That also supersedes the "id 35 is really an Event, wrong table" diagnosis below — events return empty interests too.

### The vocabulary survived; the assignments didn't

`GET /choices/volunteer_opportunity_interest/` returns **18 choices, with the same ids as the old payload** — `71` is still "Community Service", and `74` / `80` are still there. So the choice table migrated intact; what's missing is the link between opportunities and those choices.

That narrows it to one of two things, and we can't tell which from outside:

1. **The pivot rows didn't migrate** — the `opportunity_interest` (or equivalent) join table came over empty, so the relation genuinely resolves to nothing. If so this is a data-backfill job, and the old database still has the assignments (as #98 proves).
2. **The relation is never loaded/serialized** — the API Resource returns `$this->interests` without the relation being eager-loaded, or maps a relationship name that no longer matches after the rename to `interests`. If so the data is fine and it's a one-line resource fix.

A `SELECT COUNT(*)` on the pivot table would separate these two in about ten seconds; please run that first.

### Also check the write path

Our create/edit forms post interests as a **repeated `_interests` form field carrying choice ids** (`VolunteerForm.tsx`, `LearnServeForm.tsx`, `EventForm.tsx` — unchanged from the old API's contract). Please confirm the Laravel controllers still accept that field name and still sync the pivot on store/update. If they silently ignore `_interests`, then even after a backfill every newly created opportunity would come back untagged again — which would match the fact that #97 (created on the new backend) is empty just like the migrated records.

### Ask

1. Run the pivot-table count and tell us which of the two causes above it is.
2. If the assignments were lost in migration, backfill them from the old database (start with #97, whose old-backend twin #98 lists exactly ids `71`, `74`, `80`).
3. Confirm `_interests` is still the accepted write field on create **and** update for all three resource types, and that it syncs the pivot.
4. Send back `GET /opportunities/97/details/` with `interests` populated in the `{ id, name_en, name_ar, interest_type }` shape as confirmation.

No frontend change is needed either way: `lib/interests.ts`'s `normalizeInterests()` already reads `interests` first and falls back to `interest_display`, so the tag pills on the detail and list screens will light up as soon as either field carries data.

### Side note for the `is_creator` report

The old #98 payload also carries **`"is_creator": false`** as a top-level field. That's independent confirmation for `OPPORTUNITY_DETAILS_IS_CREATOR_MISSING.md`: `is_creator` was part of this endpoint's contract on the old backend and disappeared in the Laravel rewrite — it wasn't a field the frontend invented.

---

*Everything below predates the 2026-09-06 update and concerns only opportunity id `35`.*

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
