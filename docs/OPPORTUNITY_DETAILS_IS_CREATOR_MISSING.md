# `is_creator` is missing from `/opportunities/{id}/details/` — the creator loses their own controls

Status: **Frontend worked around it (we now read `relationship_tags`). We need you to confirm the intended contract before we roll that workaround out to the other detail screens — the four endpoints below currently disagree with each other.**

## The case

Opportunity `124` ("تست مهم - لاتمسح" / "do nothdelete"), organizer user `970` (`fahmymohamed291@gamil.com`).

`GET /api/opportunities/124/details/?pass_token=true`, **requested by that organizer while logged in**, returns:

```json
"created_by": { "id": 970, "user_type": "organization", "full_name": "Ahmed", ... },
"has_scan_permission": false,
"relationship_tags": ["organizer"]
```

There is **no `is_creator` key anywhere in the response** — not `false`, absent. `relationship_tags` correctly says `["organizer"]`, so the backend clearly *did* resolve the requesting user as the owner of this record; it just never surfaces that under the field name the app had been reading.

## Why that broke the screen

`/volunteer-event-detail/124` derived "am I the owner?" from `is_creator`, falling back to `created_by.id === user.id`. With `is_creator` gone, and the fallback not firing, the organizer lost — all at once:

- **List of Volunteers** button
- **Scan Permission** button (the one this was reported through)
- the **Scan QR** button inside the check-in window
- **Edit / Repost**, Close & Reopen registration, and the after-completion image controls
- worse, the Edit button that *is* still labelled "Edit" ran the **volunteer registration** flow instead, because that click handler read raw `is_creator` too

None of this is a permissions problem on your side — the attendance window for `124` is open (`qr_attendance_enabled: true`, `is_preparation_window_closed: false`, `preparation_valid_until_at: 2026-09-06T23:59:59+00:00`), and `relationship_tags` proves the backend knew who was asking.

## The four endpoints disagree

Checked live, unauthenticated, on `https://portal.fursa.raiyan.cc/api` (2026-09-06):

| Endpoint | `is_creator` | `relationship_tags` |
|---|---|---|
| `GET /opportunities/124/details/` | **absent** | present (`[]` anonymous, `["organizer"]` for the owner) |
| `GET /learn-serve-opportunities/24/` | **absent** | present |
| `GET /events/1/` | present (`false`) | **absent** |
| `GET /list-volunteer-opportunities/` | **absent** | **absent** (carries `profile_activity_tag`, `null` anonymously) |

So the two opportunity detail resources migrated to `relationship_tags`, the event detail resource did not, and the list resource has neither — even though it does serialize other per-user fields (`is_registered`) on the same row.

## Ask

1. **Was dropping `is_creator` from the opportunity detail resources intentional** (superseded by `relationship_tags`), or did it fall out of an Eloquent API Resource refactor by accident? We've assumed intentional and coded to `relationship_tags`; tell us if that's wrong before we change the rest.
2. If intentional: please **add `relationship_tags` to `/events/{id}/` and to the list resources** (`/list-volunteer-opportunities/`, `/learn-serve-opportunities/`, `/list-user-opportunities/`) so one field answers "is this mine?" everywhere. Right now the cards have no ownership signal at all beyond comparing `created_by.id` client-side, which is exactly the fragile thing `relationship_tags` was meant to replace. If `profile_activity_tag` is already meant to be that signal on list rows, please document its possible values — it's `null` for every row anonymously and it isn't in any spec we have.
3. If **not** intentional: please restore `is_creator` on `OpportunityDetailsResource` (or whichever resource backs `/opportunities/{id}/details/`), computed the same way `relationship_tags`' `organizer` entry already is.
4. Please confirm whether `relationship_tags` and any ownership field are **gated on `?pass_token=true`**. The frontend sends that param on this call, but we'd like it stated: does the resource read `$request->user()` unconditionally, or only when that flag is set? If it's flag-gated, every caller that omits it silently sees an empty `relationship_tags` and looks like a stranger to their own record.
5. Whichever way it lands, please send back the response for `GET /opportunities/124/details/?pass_token=true` **authenticated as user 970**, so we can see the final field set for a known-owner request.

## What we changed on our side (no backend dependency)

`features/shared/opportunityButtonState.ts` now exports `isViewerOrganizer(item, userId)`, which ORs three signals in order: `relationship_tags` contains `"organizer"` → `is_creator` → `created_by.id === user.id`. `VolunteerEvent.tsx` uses it for every owner-gated control on the screen, so opportunity `124` shows the organizer their buttons again regardless of which of the four shapes above the endpoint returns.

`LearnServeDetails.tsx` and `EventDetails.tsx` still use the old `is_creator || created_by.id` derivation. We've deliberately left them until question 1 is answered — `/learn-serve-opportunities/{id}/` has the same missing field, so that screen is likely broken the same way for its creators.

## Related: `is_creator` did exist on the old backend

The old API's response for opportunity `98` (the pre-Laravel twin of `97`, same organizer) carries `"is_creator": false` as a top-level field. So this isn't a field the frontend invented or misremembered — it was part of this endpoint's contract and dropped in the rewrite. See `OPPORTUNITY_INTERESTS_MISSING_ON_DETAILS.md`, which compares the two backends' responses for that record in full; interest tags went missing in the same migration.
