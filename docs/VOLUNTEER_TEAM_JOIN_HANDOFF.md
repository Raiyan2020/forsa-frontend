# "Volunteer Team" join option — backend handoff

Status: frontend implemented in `fursa-next`. **No backend changes are required** — this feature reuses an org_type choice the backend already exposes. This document exists to confirm the payload shape with the backend team, not to request new work.

## What changed

`/joinus` previously offered two roles: **Individual** and **Organizer** ("Entity-Team", any org type, selected from a dropdown). A third card, **Volunteer Team**, has been added.

Selecting "Volunteer Team" routes to the same registration screen as "Organizer" (`/entities-form`, or `/complete-details` for the Google/LinkedIn OAuth continuation) — it is **not** a new account type. It pre-selects the `organizer_type` field to the backend's existing **"Volunteer Team" org_type choice (id `21`, `value_en: "Volunteer Team"`, `value_ar: "فريق تطوعي"`)**, confirmed live via:

```
GET /choices/org_type/
→ {"id":21,"value_en":"Volunteer Team","value_ar":"فريق تطوعي"}
```

The visitor can still change the dropdown to a different org type after landing on the form — the pre-selection is a convenience default, not a lock. Submission goes through the same two endpoints every organization registration already uses, with no new fields:

## Payload — direct registration (`POST /register/`, `multipart/form-data`)

| Key | Value for a Volunteer Team registration |
|---|---|
| `company_name` | as typed |
| `organizer_type` | `"21"` (pre-filled; user-editable) |
| `email` | as typed |
| `password` | as typed |
| `phone_number` | as typed |
| `country_code` | as typed |
| `license_number` | as typed (empty allowed for license-exempt org types) |
| `nickname` | as typed, omitted if blank |
| `latitude` / `longitude` | as picked on the map |
| `preferred_language` | current site language (`en`/`ar`) |
| `user_type` | `"organization"` (unchanged) |
| `documents[]` | uploaded file(s) |

## Payload — OAuth continuation (`POST /social-auth/`, `multipart/form-data`)

Same keys as above, plus `email`, `first_name`, `last_name`, `social_media_provider`, `social_media_id`, `social_profile_pic_url` sourced from the Google/LinkedIn response. `organizer_type` is pre-filled to `"21"` the same way.

## Ask for backend

Just a confirmation, not a change request: please confirm `organizer_type: "21"` submitted through `/register/` or `/social-auth/` is processed identically to any other org_type value today (i.e. it correctly sets `is_volunteer_team: true` on the resulting profile, matching what `/profiles/volunteer-teams/` already returns for existing volunteer-team organizers). If that's already true — which the existing `/profiles/volunteer-teams/` endpoint and `is_volunteer_team` flag strongly suggest — there is nothing further to do on the backend for this feature.
