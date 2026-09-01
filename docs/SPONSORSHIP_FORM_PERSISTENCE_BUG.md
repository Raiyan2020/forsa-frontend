# Sponsorship form: `_org_type_id` / `_sponsor_type_id` / `_type_of_support_id` not persisted for a submission

Status: **frontend confirmed correct** — this is a backend data-persistence report, not a frontend fix request.

## Where this comes from

`Partner.tsx`'s "Join Our Partners" button (`/sponsorship-form`) → `SponsorshipForm.tsx` → `POST https://portal.fursa.raiyan.cc/api/sponsors/`, `multipart/form-data`.

## The bug

Sponsor record **id 9** ("Medo tesr") was submitted through this form and shows up in the admin dashboard (`/dashboard/sponsors/9/edit`) with **نوع الجهة** (org type), **نوع الرعاية** (sponsor type), and **نوع الدعم** (type of support) all empty ("اختر" — unselected), even though the submission included values for all three.

## Confirmed: the frontend sent the right thing

`SponsorshipForm.tsx`'s `handleSubmit` builds the FormData exactly as follows (verified against the current source, not just the observed network payload):

```
formData.append("org_name", values.org_name);
formData.append("_org_type_id", values.org_type);
formData.append("person_name", values.person_name);
formData.append("email", values.email);
formData.append("phone_number", values.phone_number);
formData.append("country_code", values.country_code);
formData.append("_sponsor_type_id", values.sponsor_type);
formData.append("_type_of_support_id", values.type_of_support);
formData.append("sponsorship_details", values.sponsorship_details);
formData.append("preferred_language", selectedLanguage);
// + new_sponsor_documents[i] and sponsor_logo files
```

For this submission: `_org_type_id: 166`, `_sponsor_type_id: 26`, `_type_of_support_id: 34`.

These are not placeholder/garbage values — all three are real, currently-valid choice IDs, confirmed live:
- `GET /choices/org_type/` → id `166` = "NGO" / "جمعية خيرية / غير ربحية"
- `_sponsor_type_id: 26` = "Media sponsor" / "رعاية إعلامية"
- `_type_of_support_id: 34` = "Media" / "إعلامي"

## Confirmed: this is isolated to record 9, not a broken integration

Pulled every record from `GET /sponsors/` (the same endpoint the public `/partner` page reads) and compared `_sponsor_type` / `_type_of_support` across all 8 existing sponsors:

| id | org_name | `_sponsor_type` | `_type_of_support` |
|---|---|---|---|
| **9** | Medo tesr | **null** | **null** |
| 8 | تيست 23 | `{id: 26, "Media sponsor"}` | `{id: 34, "Media"}` |
| 7 | islam | `{id: 26, "Media sponsor"}` | `{id: 28, "Gold"}` |
| 5 | STC | `{id: 24, "Financial sponsor"}` | `{id: 28, "Gold"}` |
| 4 | تدرب | `{id: 24, "Financial sponsor"}` | `{id: 30, "Bronze"}` |
| 3 | niu | `{id: 25, "Supporting Partner"}` | `{id: 35, "Other"}` |
| 2 | مركز العمل التطوعي | `{id: 25, "Supporting Partner"}` | `{id: 27, "Logistical Support"}` |
| 1 | warba bank | `{id: 24, "Financial sponsor"}` | `{id: 28, "Gold"}` |

Notably, **record 8 has the exact same `_sponsor_type_id: 26` / `_type_of_support_id: 34` combination** as record 9's submission, and it saved correctly. This rules out "these IDs are invalid" — the same field names and the same values are proven to work on another record. Record 9 (the most recent submission) is the only one of 8 total records with nulls here.

This points to something specific to that one request (intermittent failure, a validation/save-order issue, a race between the FK lookups and the record write, etc.) rather than a wholesale broken field mapping — worth checking backend logs/whatever validation path runs on `POST /sponsors/` around the time record 9 was created.

## One thing not independently verified

The dashboard screenshot also shows **نوع الجهة** (org type) empty for record 9. I could not cross-check this against the public `GET /sponsors/` response the way I did for sponsor_type/type_of_support — that endpoint doesn't include an org_type field in its schema for any record (public or otherwise), so this list only confirms org_type isn't in the public-facing payload at all, not whether it's actually stored. Worth checking directly against the record in the database/admin API.

## Ask for backend

Investigate why sponsor record 9's `_org_type_id`, `_sponsor_type_id`, and `_type_of_support_id` came back null despite a correctly-formed request with valid IDs, given an earlier record (8) with the identical `_sponsor_type_id`/`_type_of_support_id` values saved successfully. No frontend change is being requested pending that investigation — the payload construction has been verified correct against the live choices endpoints and against a working prior submission.
