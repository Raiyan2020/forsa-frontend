# Fursa — backend issues & clarifications (single log)

One file for everything the frontend needs from the backend team: bugs, contract
questions, and the answers we've already received. It replaces the fifteen
separate `*_BUG.md` / `*_CLARIFICATION.md` / `*_HANDOFF.md` docs that used to
live in this folder.

**API:** `https://portal.fursa.raiyan.cc/api/` · **Backend:** Laravel ("portal", separate repo) · **Frontend:** `fursa-next` (Next.js 16)

## How to use this file

- Every item has a **permanent id** (`BE-01`, `BE-02`, …). Quote it in replies — "BE-03 is fixed" — instead of a filename.
- Ids are never reused or renumbered. New items take the next free number, whatever section they land in.
- Items move between the two sections as their status changes; the id and the evidence stay put.
- When you fix something, please reply on the item with a concrete request/response pair, not just "done" — every item below says exactly what would let us verify it.
- **When you have worked through the open items, send one reply file back.** The exact format is in the next section — please don't skip it, it is how we know whether anything is left for us.

## How to reply — one file back to us

When you have finished the open items above (or as many as you are going to do in this
round), hand back **one markdown file**: `BACKEND_REPLY_<YYYY-MM-DD>.md`, in this same
folder or over chat. Please don't reply item-by-item across several messages — one file per
round keeps this log easy to reconcile.

The reply has exactly two possible shapes.

### Shape 1 — something is left for the frontend

List **only** what we have to do on our side, one block per item, quoting the `BE-NN` id:

```markdown
# Backend reply — 2026-09-DD

## BE-NN — <title>
**Done:** <what changed on the API>
**Proof:** <the request + the response body, or the id list, that shows it>
**Frontend must:** <the exact change we need to make — field renamed, param value,
                    new endpoint path, response shape, anything we now have to read
                    or send differently>
```

`Frontend must:` is the part we act on, so please be concrete: name the field, the accepted
values, the endpoint. "Use the new field" is not enough; `interest_display` now returns
`{ id, value_en, value_ar }` is.

Also list, in the same file, anything you **did not** do and why — a deferred item is fine,
silently skipping one is what we can't work with.

### Shape 2 — nothing is left for the frontend

If every open item is done **and** none of them needs a single change on our side, then the
whole file is just this:

```markdown
Hi Medo
```

That greeting is a **sentinel**: it means "backend side is complete, frontend has nothing to
change." So please send it *only* when that is literally true. If even one item needs a
field renamed, a param adjusted, or a response re-read on our end, use Shape 1 instead — a
"Hi Medo" that turns out to need frontend work costs us a whole debugging round to discover.

<details>
<summary><b>Template for a new item (copy this)</b></summary>

```markdown
### BE-NN — <one-line title>

| | |
|---|---|
| **Status** | Open / Answered / Resolved |
| **Endpoint** | `METHOD /path/` |
| **Frontend** | `src/…` |
| **Raised** | YYYY-MM-DD |

**What we send / What we get** — the concrete request and response.

**Why it's wrong** — expected vs. actual.

**Root-cause hypothesis (Laravel)** — pointers, clearly marked as guesses.

**Ask** — numbered, ending with what would let us verify the fix.

**Frontend status** — what we changed, or why nothing changed.
```
</details>

## Index

| id | Title | Endpoint | Status |
|---|---|---|---|
| [BE-01](#be-01--interest-tags-are-empty-on-every-opportunity-learn-serve-and-event) | Interest tags empty platform-wide | `/opportunities/{id}/details/` + all listings | **Open** |
| [BE-02](#be-02--is_creator-dropped-from-the-opportunity-detail-payload) | `is_creator` dropped from detail payload | `GET /opportunities/{id}/details/` | **Open** |
| [BE-04](#be-04--list-user-opportunities-filters-are-accepted-but-not-applied) | Filters accepted but not applied | `GET /list-user-opportunities/` | **Open** |
| [BE-05](#be-05--name-filter-on-community-posts-has-no-effect) | `name` filter has no effect | `GET /posts/` | **Open** |
| [BE-06](#be-06--sort_bynewest-doesnt-return-newest-first) | `sort_by=newest` isn't newest-first | `GET /list-volunteer-opportunities/` | **Open** |
| [BE-07](#be-07--sponsorship-form-choice-ids-not-persisted-on-record-9) | Sponsor record 9 lost its choice ids | `POST /sponsors/` | **Open** |
| [BE-08](#be-08--two-competing-mechanisms-for-attaching-a-sponsor-to-an-opportunity) | Two ways to attach a sponsor | opportunity create/update + `/sponsors/` | **Open (blocking question)** |
| [BE-09](#be-09--volunteer-team-join-option--payload-confirmation) | Volunteer Team registration payload | `POST /register/`, `/social-auth/` | **Open (confirmation only)** |
| [BE-15](#be-15--opportunity_type-filter-not-applied-on-list-all-opportunities) | `opportunity_type` filter not applied | `GET /list-all-opportunities/` | **Open** |
| [BE-16](#be-16--learn-serve-registrations-carry-no-phone-number-picture-or-gender) | Registrations row missing phone / picture / gender | `GET /learn-serve-opportunities/{id}/registrations/` | **Open** |
| [BE-17](#be-17--learning_type_display-format_display-and-certificate_type_display-are-null) | Learn-serve choice fields all `null` | `GET /learn-serve-opportunities/{id}/` | **Open** |
| [BE-03](#be-03--opportunity_status-was-always-upcoming-on-list-all-opportunities) | `opportunity_status` always `upcoming` | `GET /list-all-opportunities/` | Fixed 2026-09-07 |
| [BE-10](#be-10--download-sheet-returned-no-file-link) | Download sheet returned no link | `GET /volunteer-opportunity-registrations/?download=true` | Resolved (one question left) |
| [BE-11](#be-11--re-registering-after-unregistering-threw-a-500) | Re-registration 500 | `POST /volunteer-opportunity-registrations/` | Resolved |
| [BE-12](#be-12--scan-permissions-bulk-update--request-contract) | Bulk-update contract | `POST /scan-permissions/bulk-update/` | Resolved |
| [BE-13](#be-13--match-my-interest-returned-zero-results) | "Match My Interest" empty | listing endpoints | Resolved (watch BE-01) |
| [BE-14](#be-14--certificates-never-appear-for-volunteer-opportunities) | No certificates for volunteer opportunities | `GET /user-certificates/` | Answered |

---

# Open

### BE-01 — Interest tags are empty on every opportunity, learn-serve and event

| | |
|---|---|
| **Status** | **Open.** Started as one record (#35); the 2026-09-06 audit showed it is platform-wide; 2026-09-07 pins it to **the same record id on both backends**. |
| **Endpoint** | `GET /opportunities/{id}/details/`, `/learn-serve-opportunities/{id}/`, `/events/{id}/`, all listings |
| **Frontend** | `lib/interests.ts`, tag pills on every detail + card |
| **Raised** | 2026-09-03, escalated 2026-09-06, same-id proof 2026-09-07 |

**Opportunity `97` on the old API vs. opportunity `97` on the new one.** Not two similar
records — the same primary key, the same organizer (user `905`, "omniya"), the same title,
description and dates (2026-09-17 → 2026-09-30), and **the same opportunity-image row,
`id: 545`**. There is no ambiguity about which record this is.

Old API, `GET` details for `97`:

```json
"interests": [],
"interest_display": [
  { "id": 71, "choice_type": "volunteer_opportunity_interest", "value_en": "Community Service", "value_ar": "خدمة مجتمعية" },
  { "id": 74, "choice_type": "volunteer_opportunity_interest", "value_en": "Event Management & Organization", "value_ar": "تنظيم واداره الفعاليات" },
  { "id": 80, "choice_type": "volunteer_opportunity_interest", "value_en": "Environment", "value_ar": "البيئة" }
]
```

New API, `GET /opportunities/97/details/`:

```json
"interests": [],
"interest_display": null
```

So the tags were not "left unset by the organizer" — **this exact record had three of them,
and the old payload says where they lived**: `interest_display`, carrying
`choice_type: "volunteer_opportunity_interest"` entries. Those are **choice-table
(MasterChoice) ids**, and `GET /choices/volunteer_opportunity_interest/` still returns the
same 18 rows with the same ids today — `71` is still "Community Service", `74` and `80` are
still there. `interests` was empty on the old backend too, exactly as `lib/interests.ts`
documents ("`interests` comes from its own table, so its ids don't necessarily match the
choice ids").

**That points at a specific gap, and you have already bridged it once.** The detail Resource
serializes the newer `interests` relation (empty for every record) and `null` for
`interest_display`, while the actual assignments were choice-table rows. This is the same
two-relation split you found and fixed for BE-13: *"the filter only ever read the legacy
`interests` relation, while the current profile UI writes a separate `masterInterests`
relation … fixed by matching against both relations (translating MasterChoice ids to their
`Interest` equivalents by name)."* Opportunity tags look like the other side of that same
coin — the bridge that `match_my_interest` now has is missing in the serializer.

**Other fields that changed between the two payloads for `97`** — not asks, just so none of
this reads as a different record:

| Field | Old | New | Note |
|---|---|---|---|
| `location_en` / `location_ar` | `"8W3M+MX6, Kuwait City, Kuwait"` | gone; `map_desc` + `lat`/`lng` instead | Frontend falls back to `map_desc`, so no visible break. |
| `is_creator` | `false` (present) | absent | See BE-02 — the field existed in this contract. |
| `participants_needed` | `20` | `30` | Edited after migration. |
| `registered_volunteers_count` | `2` | `3` | New registrations since. |
| `created_by.is_public` | `true` | `false` | Flips the organizer link between `/public-profile/` and `/volunteer-private-profile/`; presumably the org changed it, but worth a glance if it wasn't deliberate. |

**Scope** — checked live, unauthenticated, 2026-09-06:

| Request | `interests` | `interest_display` |
|---|---|---|
| `GET /opportunities/97/details/` | `[]` | `null` |
| `GET /opportunities/98/details/` | `[]` | `null` |
| `GET /opportunities/124/details/` | `[]` | `null` |
| `GET /opportunities/35/details/` | `[]` | `null` |
| `GET /learn-serve-opportunities/24/` | `[]` | `null` |
| `GET /events/1/` | `[]` | `[]` |
| `GET /list-volunteer-opportunities/?per_page=100` | — | `[]` on **all 20** rows |

Not one record and not one endpoint: **nothing on the API currently carries a single
interest tag.** This also supersedes the earlier "id 35 is really an Event, wrong table"
diagnosis — events are empty too.

**The vocabulary survived; the assignments are unreachable.** Three possibilities, in the
order we'd check them:

1. **The assignments are in the choice/MasterChoice pivot and the Resource reads the `interests` relation** — most likely, given the old payload delivered them as `choice_type` entries and `interests` was empty on *both* backends. Nothing is lost; the serializer needs the same bridge BE-13's filter fix already uses.
2. **The pivot rows didn't migrate at all** — a data-backfill job. The old database still has them (record `97` above lists exactly `71`, `74`, `80`).
3. **The relation is never eager-loaded** — the Resource maps a relationship name that stopped matching after the rename.

Two queries separate all three in about a minute: `SELECT COUNT(*)` on the opportunity↔choice
pivot, and the same on the newer `interests` pivot. Please run those before anything else and
tell us the two numbers — everything below depends on which it is.

**Also check the write path.** Our create/edit forms post interests as a repeated
`_interests` form field **of choice ids** — `VolunteerForm.tsx:818`, `LearnServeForm.tsx:1010`,
`EventForm.tsx:653`, unchanged from the old API's contract. So the frontend writes in the
choice-id vocabulary and reads back a relation keyed differently. If the controllers ignore
that field name, or write it to one relation while the Resource reads the other, then even
after a backfill every newly created opportunity comes back untagged.

**Ask**

1. Run the two pivot counts and tell us which of the three causes it is.
2. If it is (1), add the MasterChoice → `Interest` bridge to the detail and list Resources — the same translation BE-13's fix does — so the tags serialize regardless of which relation holds them.
3. If it is (2), backfill from the old database — record `97` needs exactly `71`, `74`, `80`.
4. Confirm `_interests` (choice ids) is still accepted on create **and** update for all three resource types, and say which relation it writes to.
5. Send back `GET /opportunities/97/details/` with this record's three tags present, in whichever field you settle on (`interests` in the `{ id, name_en, name_ar, interest_type }` shape, or `interest_display` in the old choice shape — we read both).

**Frontend status** — nothing to change. `normalizeInterests()` (`lib/interests.ts`) already
reads `interests` first and falls back to `interest_display`, so the pills light up as soon
as either field carries data.

---

### BE-02 — `is_creator` dropped from the opportunity detail payload

| | |
|---|---|
| **Status** | **Open.** Frontend worked around it; we need the intended contract confirmed before rolling that out to the other detail screens. |
| **Endpoint** | `GET /opportunities/{id}/details/` |
| **Frontend** | `features/opportunities/components/VolunteerEvent.tsx` |
| **Raised** | 2026-09-06 |

Opportunity `124`, organizer user `970`. `GET /opportunities/124/details/?pass_token=true`,
**requested by that organizer while logged in**, returns:

```json
"created_by": { "id": 970, "user_type": "organization", "full_name": "Ahmed", ... },
"has_scan_permission": false,
"relationship_tags": ["organizer"]
```

There is **no `is_creator` key anywhere in the response** — not `false`, absent.
`relationship_tags` correctly says `["organizer"]`, so the backend did resolve the
requester as the owner; it just never surfaces that under the field name the app read.

**What broke.** The screen derived ownership from `is_creator` with a `created_by.id === user.id`
fallback. With the field gone and the fallback not firing, the organizer lost, all at once:
**List of Volunteers**, **Scan Permission** (how this was reported), **Scan QR**,
**Edit / Repost**, close & reopen registration, and the after-completion image controls —
and the button still labelled "Edit" ran the **volunteer registration** flow, because that
handler read raw `is_creator` too. Not a permissions problem: the attendance window for
`124` is open (`qr_attendance_enabled: true`, `is_preparation_window_closed: false`,
`preparation_valid_until_at: 2026-09-06T23:59:59+00:00`).

**The four endpoints disagree** — checked live, unauthenticated, 2026-09-06:

| Endpoint | `is_creator` | `relationship_tags` |
|---|---|---|
| `GET /opportunities/124/details/` | **absent** | present (`[]` anonymous, `["organizer"]` for the owner) |
| `GET /learn-serve-opportunities/24/` | **absent** | present |
| `GET /events/1/` | present (`false`) | **absent** |
| `GET /list-volunteer-opportunities/` | **absent** | **absent** (carries `profile_activity_tag`, `null` anonymously) |

The two opportunity detail resources migrated to `relationship_tags`, the event detail
resource didn't, and the list resource has neither — though it does serialize other
per-user fields (`is_registered`) on the same row.

**Ask**

1. **Was dropping `is_creator` intentional** (superseded by `relationship_tags`), or did it fall out of a Resource refactor? We assumed intentional and coded to `relationship_tags`.
2. If intentional: **add `relationship_tags` to `/events/{id}/` and to the list resources** (`/list-volunteer-opportunities/`, `/learn-serve-opportunities/`, `/list-user-opportunities/`) so one field answers "is this mine?" everywhere. Today the cards have no ownership signal beyond comparing `created_by.id` client-side — the fragile thing `relationship_tags` was meant to replace. If `profile_activity_tag` is already that signal on list rows, document its values; it's `null` for every row anonymously and isn't in any spec we have.
3. If not intentional: restore `is_creator` on the detail Resource, computed the same way `relationship_tags`' `organizer` entry already is.
4. Confirm whether these fields are **gated on `?pass_token=true`** — does the Resource read `$request->user()` unconditionally, or only when that flag is set? If it's flag-gated, any caller that omits it silently looks like a stranger to their own record.
5. Send back `GET /opportunities/124/details/?pass_token=true` **authenticated as user 970**.

**Frontend status** — `features/shared/opportunityButtonState.ts` now exports
`isViewerOrganizer(item, userId)`, which ORs three signals in order: `relationship_tags`
contains `"organizer"` → `is_creator` → `created_by.id === user.id`. `VolunteerEvent.tsx`
uses it for every owner-gated control, so the screen works regardless of which of the four
shapes above an endpoint returns. **Update 2026-09-07:** `LearnServeDetails.tsx` now uses it
too — `/learn-serve-opportunities/{id}/` is missing `is_creator` in exactly the same way, and
that screen's Edit button was falling through into the registration-confirmation modal for
the creator. `EventDetails.tsx` still uses the old two-signal derivation; `/events/{id}/` is
the one endpoint that still sends `is_creator`, so it isn't broken today — but it will be the
moment that resource is migrated like the other two, which is what question 1 is about.

> The old backend's response for #98 carries `"is_creator": false` as a top-level field —
> independent proof this was part of the contract and was dropped in the rewrite, not a
> field the frontend invented. Same migration as BE-01.

---

### BE-04 — `list-user-opportunities` filters are accepted but not applied

| | |
|---|---|
| **Status** | **Open, blocking.** `tags` confirmed broken; the others need re-verifying rather than assuming. |
| **Endpoint** | `GET /list-user-opportunities/` |
| **Frontend** | `features/profile/components/CommonProfile.tsx` |
| **Raised** | 2026-09-02 |

```
GET /list-user-opportunities/?filter_type=registered&user_id=65&tags%5B%5D=rrr&page=1&limit=30
```

The request is well-formed: `tags` goes as a repeated `tags[]=<value>` array param, the
same convention this app already uses successfully elsewhere (`teams[]=` / `roles[]=` on
the volunteer registrations list). The same request **without** `tags` is confirmed working.

Expected a subset of user 65's opportunities tagged "rrr"; got a response **identical to
the unfiltered one**. `200 OK`, no validation error, no effect.

**Hypothesis (Laravel)** — no code visibility, just pointers:

- `$request->validate()` / `->validated()` not listing `tags` in its rules, so it silently disappears even though `all()` / `input()` would still see it. That explains a `200` with no error and no effect.
- If tags are many-to-many, the filter needs `whereHas('tags', fn ($q) => $q->whereIn(...))` (or a pivot `whereIn`), not `where('tags', ...)` on the opportunities table.
- Confirm `tags[]=rrr` is actually read as an array (`$request->query('tags')`) rather than expected as a comma-separated string or a differently-named key.

**Ask**

1. Retest **every** filter key this endpoint accepts (`tags`, `opportunity_type`, `opportunity_status`, `start_date`, `end_date`, `search`, and any others) with a range of values — confirm each narrows the result set, not just that it returns `200`.
2. For `tags` specifically, confirm the expected param format, in case the two sides disagree on shape rather than the filter being unimplemented.
3. Send back, per filter key, one example request plus a before/after pair showing the result set actually changing.

**Frontend status** — unchanged; the request already matches this app's established
array-filter convention.

---

### BE-05 — `name` filter on community `/posts/` has no effect

| | |
|---|---|
| **Status** | **Open, blocking.** |
| **Endpoint** | `GET /posts/` |
| **Frontend** | `features/community/components/CommunityFilterModal.tsx`, `Community.tsx:92` |
| **Raised** | 2026-09-02 |

```
GET /posts/?page=1&limit=10&search=&name=isl&type=
```

Same request, same pagination, captured minutes apart — only difference is `name=isl` vs.
no `name`:

- **Without `name`:** 11 posts total, ids `15, 14, 13, 12, 11, 10, 9, 4, 3, 2` (page 1 of 2).
- **With `name=isl`:** **identical** 11 posts, same ids, same order, same `total: 11`.

Exactly one post in the dataset plausibly matches "isl" — id `15`, author `"full_name": "islam"`,
`"nickname": "islamGH"`. The filtered response should have returned that one, not everything.

**Hypothesis (Laravel).** Same shape as BE-04 — accepted with `200`, no effect. Worth
checking whether `name` is missing from the controller's validation rules, and whether it's
meant to match the post's own `nickname`, the author's `full_name`, or both — the latter
needs `whereHas('user', …)`, since the posts table has no `name` column.

**Ask**

1. Confirm what `name` is intended to filter on and wire it into the query.
2. Retest with a value that should match exactly one post (`name=isl` against the dataset above).
3. While in this endpoint, verify `search` and `type` behave correctly too — we'd rather catch a sibling issue now than file a second item.
4. Send back the exact request URL and before/after id lists showing `name` narrowing the set.

**Frontend status** — unchanged; `name` is forwarded exactly as typed.

---

### BE-06 — `sort_by=newest` doesn't return newest-first

| | |
|---|---|
| **Status** | **Open, blocking.** |
| **Endpoint** | `GET /list-volunteer-opportunities/` |
| **Frontend** | `features/opportunities/components/AllOpportuniteFilterModal.tsx` |
| **Raised** | 2026-09-03 |

The Sort option sends the literal values `newest` / `oldest`:

```
GET /list-volunteer-opportunities/?page=1&limit=9&search=&location=&gender=&opportunity_nationality=&type=&status=&sort_by=newest
```

Same request back to back, only `sort_by=newest` added:

- **Without `sort_by`:** `126, 125, 127, 97, 98, 12, 13, 15, 18`
- **With `sort_by=newest`:** `97, 98, 127, 126, 125, 92, 94, 95, 104`

`125`, `126`, `127` were created within minutes of each other on `2026-09-03` — the newest
records in the dataset by id and by creation time. `97` / `98` are older. Under
`sort_by=newest` the newest records rank **behind** the older ones. The tail then mixes in
`92`, `94`, `95` — UK records with `due_date` back in **August** — ahead of `104`
(`due_date 2026-09-02`). Whatever it's ordering by, it isn't creation time, id, `due_date`
or `start_date` in either direction.

**Hypothesis.** Either `sort_by` isn't wired into an `orderBy()` at all (so what we see is
non-deterministic pagination order), or it orders by the wrong column — e.g. `updated_at`
instead of `created_at`, making "newest" mean "most recently modified for any reason".

**Ask**

1. Confirm what column `newest`/`oldest` should order by (ideally `created_at`) and retest across a full result set, not just page 1.
2. Confirm the **unsorted** default ordering is intentional — it currently looks grouped by status relevance (in-progress → upcoming → completed), which is fine, but we'd like that confirmed as deliberate.
3. Send back one `sort_by=newest` request with the resulting id / `created_at` sequence showing it descending.

**Frontend status** — unchanged; the modal already sends the literal `newest`/`oldest`.

---

### BE-07 — Sponsorship form: choice ids not persisted on record 9

| | |
|---|---|
| **Status** | **Open** — data-persistence investigation. Frontend payload confirmed correct. |
| **Endpoint** | `POST /sponsors/` (`multipart/form-data`) |
| **Frontend** | `features/partners/components/SponsorshipForm.tsx` |
| **Raised** | 2026-09-01 |

Sponsor record **9** ("Medo tesr") shows in the admin dashboard with **نوع الجهة**,
**نوع الرعاية** and **نوع الدعم** all empty, though the submission carried all three:
`_org_type_id: 166`, `_sponsor_type_id: 26`, `_type_of_support_id: 34`.

**The frontend sent the right thing** — verified against the current source:

```
formData.append("org_name", values.org_name);
formData.append("_org_type_id", values.org_type);
formData.append("_sponsor_type_id", values.sponsor_type);
formData.append("_type_of_support_id", values.type_of_support);
…
```

All three are real, currently-valid choice ids: `/choices/org_type/` → `166` = "NGO" /
"جمعية خيرية / غير ربحية"; `_sponsor_type_id: 26` = "Media sponsor"; `_type_of_support_id: 34` = "Media".

**Isolated to record 9, not a broken mapping** — every record from `GET /sponsors/`:

| id | org_name | `_sponsor_type` | `_type_of_support` |
|---|---|---|---|
| **9** | Medo tesr | **null** | **null** |
| 8 | تيست 23 | `{26, "Media sponsor"}` | `{34, "Media"}` |
| 7 | islam | `{26, "Media sponsor"}` | `{28, "Gold"}` |
| 5 | STC | `{24, "Financial sponsor"}` | `{28, "Gold"}` |
| 4 | تدرب | `{24, "Financial sponsor"}` | `{30, "Bronze"}` |
| 3 | niu | `{25, "Supporting Partner"}` | `{35, "Other"}` |
| 2 | مركز العمل التطوعي | `{25, "Supporting Partner"}` | `{27, "Logistical Support"}` |
| 1 | warba bank | `{24, "Financial sponsor"}` | `{28, "Gold"}` |

Record **8 has the identical `26` / `34` combination** and saved fine. So the ids aren't
invalid and the field names work — record 9 (the most recent submission) is the only one of
eight with nulls. That points at something specific to that request: intermittent failure,
validation/save-order, a race between the FK lookups and the write.

**Not independently verified:** the empty **نوع الجهة** — `GET /sponsors/` carries no
org_type field for any record, so that list only proves it isn't in the public payload, not
whether it's stored. Please check the record directly.

**Ask** — investigate why record 9's three ids came back null despite a well-formed request
with valid ids, given record 8 with the same values saved successfully. Backend logs around
that record's creation are the place to start. No frontend change requested pending that.

---

### BE-08 — Two competing mechanisms for attaching a sponsor to an opportunity

| | |
|---|---|
| **Status** | **Open — blocking question.** No frontend work started on the new UI. |
| **Endpoint** | opportunity create/update (inline) vs. proposed `/…/{id}/sponsors/` |
| **Frontend** | `features/opportunities/components/LearnServeForm.tsx` |
| **Raised** | 2026-08-31 |

Your `FRONTEND_PROFILE_TABS_SPONSORS_AND_FIXES.md` §6 describes attaching a sponsor to an
opportunity as **new** — "لسه مفيش طريقة لإضافة راعي لفرصة تطوعية/تطويرية قبل كده (كان
موجود بس للفعاليات، ودّا كان فيه مشكلة)" — and proposes a separate REST resource:

```
POST   /api/volunteer-opportunities/{id}/sponsors/    { "organization_id": 12 }
DELETE /api/volunteer-opportunities/{id}/sponsors/{sponsorId}/
POST   /api/learn-serve-opportunities/{id}/sponsors/
DELETE /api/learn-serve-opportunities/{id}/sponsors/{sponsorId}/
```

But `LearnServeForm.tsx` **already has a working sponsor picker** — `FieldArray name="sponsors"`,
an organization search/pick UI, pre-populated from `opportunityData?.opportunity_sponsor_images`
on edit. It submits inline, as part of the same multipart create/update request:

```
opportunity_sponsor_images_organization_{n}: <organization id>
opportunity_sponsor_images_position_{n}: <position>
```

That reads and writes the same `opportunity_sponsor_images` relationship the new endpoints
target, through a different mechanism. It's live in the learn-and-serve create/edit flow
today (not verified for `VolunteerForm.tsx` — worth checking there too).

Two ways to write the same relationship risk fighting each other: the inline picker could
silently overwrite whatever the add/remove endpoints changed, or vice versa, depending on
how a full update that includes (or omits) the sponsors array is handled.

**Ask** — before any new sponsor UI is built:

1. Is the inline `opportunity_sponsor_images_organization_{n}` mechanism being **replaced** by the `/sponsors/` endpoints, or are both meant to coexist?
2. If replaced: does an opportunity update *without* those fields now leave existing sponsors untouched (rather than clearing them), so the frontend can safely stop sending them?
3. Was the "issue" mentioned in your doc (previously events-only) about this inline mechanism specifically, or something else?

**Frontend status** — untouched pending the answer.

---

### BE-09 — "Volunteer Team" join option — payload confirmation

| | |
|---|---|
| **Status** | **Open — confirmation only. No backend work expected.** |
| **Endpoint** | `POST /register/`, `POST /social-auth/` (`multipart/form-data`) |
| **Frontend** | `/joinus` → `/entities-form` / `/complete-details` |
| **Raised** | 2026-08-30 |

`/joinus` previously offered **Individual** and **Organizer**. A third card, **Volunteer
Team**, was added. It is **not a new account type** — it routes to the same organization
registration screen and pre-selects `organizer_type` to the org_type choice you already
expose, confirmed live:

```
GET /choices/org_type/ → {"id":21,"value_en":"Volunteer Team","value_ar":"فريق تطوعي"}
```

The visitor can still change the dropdown afterwards; the pre-selection is a default, not a
lock. Submission uses the same two endpoints as every organization registration, with **no
new fields**: `company_name`, `organizer_type` (`"21"`), `email`, `password`,
`phone_number`, `country_code`, `license_number` (empty allowed for license-exempt types),
`nickname` (omitted if blank), `latitude`/`longitude`, `preferred_language`,
`user_type: "organization"`, `documents[]`. The OAuth continuation adds `first_name`,
`last_name`, `social_media_provider`, `social_media_id`, `social_profile_pic_url`.

**Ask** — just confirm `organizer_type: "21"` through `/register/` or `/social-auth/` is
processed identically to any other org_type today, i.e. it sets `is_volunteer_team: true`
on the resulting profile, matching what `/profiles/volunteer-teams/` already returns for
existing volunteer-team organizers. If that's already true — which that endpoint and flag
strongly suggest — there's nothing to do.

---

### BE-15 — `opportunity_type` filter not applied on `list-all-opportunities`

| | |
|---|---|
| **Status** | **Open, blocking.** Also needs the accepted vocabulary settled — our two callers disagree. |
| **Endpoint** | `GET /list-all-opportunities/` (`filter_type=organized`) |
| **Frontend** | `features/profile/components/ProfileDescriptionTabs.tsx` (own profile), `CommonProfile.tsx` (public profile) |
| **Raised** | 2026-09-07 |

Three requests, captured minutes apart on 2026-09-07, differing **only** in
`opportunity_type`:

```
1) …&filter_type=organized&opportunity_type=&status=                          → 7 rows
2) …&filter_type=organized&opportunity_type=volunteer_opportunity&status=     → the same 7 rows
3) …&filter_type=organized&opportunity_type=learn_serve_opportunity&status=   → the same 7 rows
```

All three return ids `115, 122, 113, 118, 121, 124, 125`, same order, `"total": 7` — and
**every one of those rows self-reports `"opportunity_type": "volunteer_opportunity"`**.

Request 3 is the decisive one: it asks for learn-serve opportunities and gets back seven
records that the response's own `opportunity_type` field labels `volunteer_opportunity`. The
payload contradicts the filter it was given, whatever vocabulary is expected — so either the
param isn't wired into the query, or an unrecognised value falls through to "no filter"
instead of erroring.

**Our two screens send two different vocabularies** — please tell us which one is right, we
will fix the other:

| Caller | Sends |
|---|---|
| `ProfileDescriptionTabs.tsx:41-42` (logged-in user's own profile tabs) | `volunteer_opportunity` / `learn_serve_opportunity` — the long form, as in the test above |
| `CommonProfile.tsx:160-165` (public profile tabs) | `volunteer` / `learn` — the short form |

Both hit `list-all-opportunities` with `filter_type=organized`, and each carries a comment
claiming its own form is "the value `/list-all-opportunities/` accepts". One of them is
wrong and we can't tell which from the outside, because **both are accepted with `200` and
neither changes the result**.

**Hypothesis (Laravel).** Same shape as BE-04 and BE-05 — a param accepted with `200`, no
validation error, no effect. Worth checking whether `opportunity_type` is missing from this
controller's validation rules, and whether the intended filter is a `where` on the
opportunities table's own type column or a union/`whereHasMorph` across the two opportunity
models (this endpoint deliberately merges both types, so a naive `where` on one model's
column would silently drop out of the merged query).

**Ask**

1. Wire `opportunity_type` into the query on this endpoint, and confirm request 3 above returns learn-serve records only (or an empty set if this organizer has none — either is a correct answer; seven volunteer opportunities is not).
2. **State the accepted values** — `volunteer` / `learn`, or `volunteer_opportunity` / `learn_serve_opportunity`, or both. We'll align both screens on whichever you name.
3. Make an unrecognised value a `422` rather than a silent full list. A no-op filter is indistinguishable from a working one on the frontend, which is how this survived unnoticed on the own-profile tab.
4. While in this endpoint, confirm `status` and `search` are actually applied too — the tests above sent `status=` empty, so they're untested, and this endpoint now has three params we can't trust.
5. Send back one request per accepted `opportunity_type` value with the resulting id list, so we can verify the vocabulary and the filtering in one go.

**Frontend status** — unchanged. Both screens already send a type param on every tab switch;
nothing to adjust until we know which vocabulary is authoritative. Note that
`GET /list-user-opportunities/` (BE-04) takes the same `opportunity_type` param from
`CommonProfile.tsx` for volunteer profiles, so please answer the vocabulary question for
both endpoints.

---

### BE-16 — Learn-serve registrations carry no phone number, picture or gender

| | |
|---|---|
| **Status** | **Open.** The frontend now renders what this row does carry; three columns can't be filled from it. |
| **Endpoint** | `GET /learn-serve-opportunities/{id}/registrations/` |
| **Frontend** | `features/opportunities/components/RegisterList.tsx`, `RegisterListForLearnandServe.tsx` |
| **Raised** | 2026-09-07 |

A row from opportunity `30` (three registrations, `total: 3`):

```json
{
  "id": 215,
  "opportunity_id": 30,
  "user_id": 690,
  "user_name": "Ahmed Abdullah",
  "user_email": "ahmednabeeh98@gmail.com",
  "civil_id": "295101912002",
  "passport_number": null,
  "registration_date": "2026-09-07T08:03:22+00:00",
  "status": "pending",
  "is_attended": false,
  "is_certified": false,
  "certificate_image": null,
  "time_slot": null
}
```

**This one is on us, mostly** — the register-list screens were written against an older
nested shape (`user.full_name`, `user.email`, `user.phone_number`) and read `undefined` from
every cell, so the table showed blank names and "-" for email and phone even though the
name and email were right there in the payload. Fixed on 2026-09-07 (see below). **No
backend action needed for that part.**

What we can't fix from this payload is three columns' worth of data that simply isn't in it:

| Column | Field we'd need | In this payload? |
|---|---|---|
| رقم الاتصال (contact number) | `user_contact_number` / `phone_number` | **No** |
| avatar next to the name | `profile_pic` | **No** |
| avatar fallback (male/female placeholder) | `gender_display` | **No** |
| profile-link target (public vs. private profile) | `is_public` | **No** |

**The volunteer equivalent already sends all of them.**
`GET /volunteer-opportunity-registrations/` returns `full_name`, `user_email`,
`user_contact_number`, `phone_number` and `civil_id` on each row — same screen family, same
columns, richer payload. So the two registration endpoints disagree on both the **field
names** (`full_name` vs. `user_name`) and the **field set**.

**Ask**

1. Add `user_contact_number` (or `phone_number` + `country_code`), `profile_pic`, `gender_display` and `is_public` to this row — the same four the volunteer registrations endpoint already carries. Without the first one the contact column is permanently "-"; without the others every volunteer gets the generic placeholder avatar and the name links to the private profile even when their profile is public.
2. Tell us whether `user_name` vs. `full_name` is a deliberate difference or an accident. If you can align both endpoints on one name for the same concept we'll follow it; if not, say so and we'll keep reading both.
3. Confirm what `status` (`pending` here for all three) and `time_slot` are meant to drive — neither screen renders them today, and `pending` on every row makes us wonder whether an approval step exists that the organizer is supposed to see.

**Frontend status — fixed 2026-09-07.** New `features/opportunities/registrationRow.ts`
exports `registrationPerson(row)`, which reads either shape: flat (`user_name`, `user_email`,
`user_id`, `civil_id`) or nested (`user.full_name`, …). Both register-list screens go through
it, so names and emails now render, the civil id shows under the name, and the profile link
uses `user_id`. It also fixed a harder failure in `RegisterListForLearnandServe.tsx` (the
certificate-type variant at `/leran-share-register-list`), which read `rowData.user.profile_pic`
and `rowData.user.full_name` unguarded — with no `user` object in the payload that threw and
took the whole page down, rather than merely rendering dashes.

---

### BE-17 — `learning_type_display`, `format_display` and `certificate_type_display` are null

| | |
|---|---|
| **Status** | **Open.** Same family as BE-01, different fields — these are single-choice FKs, not a pivot. |
| **Endpoint** | `GET /learn-serve-opportunities/{id}/` |
| **Frontend** | `features/opportunities/components/LearnServeDetails.tsx` |
| **Raised** | 2026-09-07 |

`GET /learn-serve-opportunities/30/`, checked live:

```json
"learning_type_display": null,
"format_display": null,
"certificate_type_display": null,
"interests": [], "interest_display": [],
"requires_check_in": true,
"manual_attendance_enabled": true,
"qr_attendance_enabled": true
```

There is no raw `learning_type` / `format` / `certificate_type` id field on the payload
either — only the three `_display` objects, and all three are `null`. Note the record is
internally inconsistent about itself: it has **no learning type** yet reports
`requires_check_in: true`, which only makes sense for one of the types.

**What it costs on the screen**

| Field | Consequence |
|---|---|
| `learning_type_display` | The detail page's "Type" row renders blank. It also **routed the organizer to the wrong registrations screen** — see the frontend note below. |
| `format_display` | The page falls back to showing "Online" (`t("COMMON.ONLINE")`) and picks the online icon, so an in-person opportunity is silently mislabelled — the fallback was written for old records with no format, not for every record. |
| `certificate_type_display` | The certificate row is hidden entirely (it only renders for Course/Internship, which is decided by the null field above). |

**Ask**

1. Are these three ever populated for any learn-serve record? A `SELECT` of the three FK columns with a `COUNT(*) WHERE ... IS NOT NULL` would tell us in one query whether the data is missing or just not serialized.
2. If the columns hold values but the Resource doesn't load them, load them — same shape as BE-01's third hypothesis.
3. If the values were lost in migration, tell us, and please also send the raw `learning_type` / `format` / `certificate_type` ids alongside the `_display` objects. The forms already submit `learningType` / `format` / `certificateType` as choice ids, so a raw id on read would let us render from `/choices/` ourselves instead of depending on the nested object.
4. Confirm what `requires_check_in: true` means on a record with no learning type — is it a default, or is the type actually set in the database and only missing from the response?

**Frontend status — routing fixed 2026-09-07, display still degraded.** `LearnServeDetails.tsx`
used to pick between the two register-list screens by matching
`learning_type_display.value_en` against `["Course", "Internship"]`. With the field `null`
that matched nothing, so **every** learn-serve opportunity — including this one, which
requires a check-in — landed on `/learn-share-register-list`, the read-only list with no
attendance control, leaving the organizer no way to mark anyone present. It now routes on
`requires_check_in !== false` instead, which is the flag that actually describes the need
(and the destination self-gates the button on the check-in window anyway). The old label
check also never included "Class", which the code's own comment lists as needing a check-in.

The Type / Format / Certificate rows stay blank-or-wrong until the fields carry data; we
haven't papered over `format_display` with a guess, since "Online" vs "In person" changes
what the page shows (a map link vs. a meeting link).

---

# Answered / Resolved

Kept for the record. Reopen by moving the item back up and adding a dated note.

### BE-03 — `opportunity_status` was always "upcoming" on `list-all-opportunities`

| | |
|---|---|
| **Status** | **Fixed — confirmed 2026-09-07 from a live `filter_type=organized` response.** |
| **Endpoint** | `GET /list-all-opportunities/` |
| **Frontend** | `features/profile/components/ProfileVolunteerCard.tsx` (status badge) |
| **Raised** | 2026-09-03 |

Two real responses captured the same minute (`~2026-09-03T09:0X`), today being `2026-09-03`:

`?search=&page=1&limit=9&filter_type=organized&opportunity_type=&status=`

| id | start_date | end_date | opportunity_status | action_state | has_started | has_ended |
|---|---|---|---|---|---|---|
| 113 | 2026-08-29 | 2026-08-31 | **upcoming** | ended | false | true |
| 115 | 2026-09-02 | 2026-09-17 | **upcoming** | started | true | false |
| 118 | 2026-08-31 | 2026-08-31 | **upcoming** | ended | false | true |
| 121 | 2026-09-01 | 2026-09-04 | **upcoming** | started | true | false |
| 124 | 2026-09-02 | 2026-09-03 | **upcoming** | started | true | false |
| 125 | 2026-09-03 | 2026-09-04 | **upcoming** | started | true | false |

`?filter_type=organized&user_id=975&page=1&limit=30`

| id | start_date | end_date | opportunity_status | action_state | has_started | has_ended |
|---|---|---|---|---|---|---|
| 114 | 2026-08-28 | 2026-08-31 | **upcoming** | ended | false | true |
| 116 | 2026-09-01 | 2026-09-03 | **upcoming** | started | true | false |
| 117 | 2026-08-30 | 2026-08-30 | **upcoming** | ended | false | true |
| 119 | 2026-08-30 | 2026-08-30 | **upcoming** | ended | false | true |

**Every item reports `upcoming`**, including ones that ended days earlier (#113) and ones
in progress (#125, started that day). `action_state`, `has_started` and `has_ended` are
clearly recomputed per item against the current date; `opportunity_status` is not.

**Effect.** Every card on an organizer's own profile or a public profile shows a "قادمة"
(Upcoming) badge regardless of real state.

**Hypothesis.** The endpoint serializes `opportunity_status` from a stored/cached column
(or one only updated on write / by a scheduled job) instead of deriving it live the way
`action_state` does. `/opportunities/{id}/details/` returns a value that does vary
correctly, so this looks specific to this list serializer — or to whatever recomputes the
stored value not running for these records.

**Ask**

1. Make `opportunity_status` here reflect real current state, consistent with `action_state` / `has_started` / `has_ended` on the same payload.
2. If `opportunity_status` and `action_state` are deliberately different concepts (one admin-set, one date-derived), say which one the status badge should read — today they disagree on effectively every record.
3. Send back a re-tested response showing `opportunity_status` varying per item.

**Frontend status** — unchanged. The badge already reads the field documented as the
opportunity's status; switching it to `action_state` without confirmation would just swap
one field for another without knowing which is authoritative.

**Resolution (2026-09-07).** The same request now returns a per-item value that agrees with
`action_state` on every row:

| id | start_date | end_date | opportunity_status | action_state |
|---|---|---|---|---|
| 115 | 2026-09-02 | 2026-09-17 | inprogress | started |
| 122 | 2026-09-02 | 2026-09-17 | inprogress | started |
| 113 | 2026-08-29 | 2026-08-31 | completed | ended |
| 118 | 2026-08-31 | 2026-08-31 | completed | ended |
| 121 | 2026-09-01 | 2026-09-04 | completed | ended |
| 124 | 2026-09-02 | 2026-09-03 | completed | ended |
| 125 | 2026-09-03 | 2026-09-04 | completed | ended |

No frontend change was needed — the badge always read `opportunity_status`, and it is now
correct. Question 2 (whether `opportunity_status` and `action_state` are deliberately
different concepts) is effectively answered by them now agreeing.

> **Minor, no action needed:** the ended rows report `has_started: false` alongside
> `has_ended: true` (e.g. #121, which started 2026-09-01). We read `action_state`, not these
> two, so it costs us nothing — but if `has_started` is meant to mean "started **and** not
> yet ended", that's worth a line in the field docs, since the name reads as "has ever
> started".

---

### BE-10 — "Download Sheet" returned no file link

| | |
|---|---|
| **Status** | **Resolved** — with one question still unanswered (see below). |
| **Endpoint** | `GET /volunteer-opportunity-registrations/?…&download=true` |
| **Frontend** | `features/opportunities/components/VolunteerList.tsx`, `services/registrations.ts` |

The button fired `?opportunity_id=113&download=true&mark_attendance=true&date=2026-08-29`,
got a normal `200` with the usual list payload and no `downloadUrl`, so it showed a success
toast and downloaded nothing. Backend confirmed the payload is nested under the standard
`data` envelope field, unlike its sibling download endpoints which return `downloadUrl` at
the envelope's top level.

Fixed in `downloadVolunteerRegistrations()`, which now unwraps `r.data.data`.
`handleDownload()` also shows an error toast when a request succeeds without a
`downloadUrl`, and surfaces `attendance_marked_count` in a second toast when
`mark_attendance` was requested.

> **Still open:** is `mark_attendance` + `date` actually applied server-side when
> `download=true` is also present? The sample response showed `is_attended: false` and an
> empty `date_wise_attended` on the one returned row. Please confirm.

---

### BE-11 — Re-registering after unregistering threw a 500

| | |
|---|---|
| **Status** | **Resolved, verified.** |
| **Endpoint** | `POST /volunteer-opportunity-registrations/`, `DELETE /volunteer-opportunities/{id}/unregister/` |

Register → unregister (`200 success`) → register again with the same payload returned a raw
`500`:

```
SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry '97-690'
for key 'volunteer_opportunity_registrations.vol_opp_reg_unique'
```

`store()` was doing an unconditional `create()` against a table with a unique
`(opportunity_id, user_id)` index, while `unregister` only soft-cancelled the row.

Fixed: `store()` now revives the cancelled row instead of inserting a fresh one (same
`registration.id` on re-registration), reuses the existing assignment row, and catches the
residual race-condition duplicate as a normal `422` instead of a raw `500`. No frontend
change needed — both registration-flow consumers already handle `400`/`422` identically via
`getApiErrorMessage()`.

---

### BE-12 — Scan permissions bulk update — request contract

| | |
|---|---|
| **Status** | **Resolved, 2026-09-02.** The frontend's existing payload works unchanged. |
| **Endpoint** | `POST /scan-permissions/bulk-update/` |
| **Frontend** | `features/opportunities/components/ScanPermission.tsx`, `services/attendance.ts` |

The endpoint had only ever validated `permissions[]`; the frontend had always sent
`user_ids` + `is_allowed` and got a `422` naming a `permissions` field it had never been
told about. Rather than force a migration, **the endpoint now accepts both shapes**.

**Field contract (backend's reply, condensed):**

| Field | Type | Required | Shape / notes |
|---|---|---|---|
| `permissions` | array of objects | one of `permissions` \| `user_ids` | `[{ "user_id": 5, "is_allowed": true }]`. Canonical. Per-entry flag, so one call **can mix** grants and revokes. `min:1`. |
| `opportunity_id` | integer | one of `opportunity_id` \| `event_id` | Must exist; caller must be `created_by`. |
| `event_id` | integer | one of `opportunity_id` \| `event_id` | Supported; caller must be the event's organization owner. |
| `user_ids` | array of integers | one of `permissions` \| `user_ids` | Normalised server-side into `permissions[]` using the shared `is_allowed`. A bare scalar is also accepted. |
| `is_allowed` | boolean | optional | Only meaningful with `user_ids`; applies to the whole batch. **Omitted ⇒ `true`.** Ignored when `permissions[]` is sent. |

**Precedence:** `permissions[]` wins; otherwise `user_ids` + `is_allowed` is converted.

Success is the standard envelope with `data` carrying one entry per user in request order —
`{ user_id, is_allowed, scan_permission_id }`. `is_allowed` there is the **persisted** value;
trust it over what was sent. Writes are `updateOrCreate` on
`(user_id, opportunity_id, event_id)`, so repeating a grant updates rather than duplicates
and `scan_permission_id` stays stable.

Errors: `422` when neither shape is provided (message names both, under
`validation_errors.permissions`); `400` when neither scope is provided (reason in `msg`,
**not** in `validation_errors`); `403` for a non-owner; `422` `exists` errors keyed
`permissions.N.user_id` — where `N` indexes **your `user_ids` array**, since normalisation
happens before validation.

**`GET /scan-permissions/list/` returns only rows with `is_allowed = true`.** A revoke keeps
the row with `is_allowed = false`, so it disappears from `list` rather than showing as
denied — refetching after a revoke is the correct refresh.

Frontend side, done while waiting: both callers now check the **envelope**
(`isApiSuccess()`), not just the HTTP status, and surface the API's localized validation
messages via `getApiErrorMessages()`. Previously they looked for `message_en` / `message_ar`,
keys this endpoint never sends, so the real reason never reached the user.

---

### BE-13 — "Match My Interest" returned zero results

| | |
|---|---|
| **Status** | **Resolved, verified** — but see the note against BE-01. |
| **Endpoint** | `GET /list-volunteer-opportunities/`, `/learn-serve-opportunities/` with `match_my_interest=true` |

The toggle sends a bare boolean and relies on the backend resolving the user from the token.
Both endpoints returned `"data": [], total: 0` every time.

Real bug, unrelated to BE-01: the filter only ever read the legacy `interests` relation,
while the current profile UI (`PATCH /volunteer-profile/` with MasterChoice ids) writes a
separate `masterInterests` relation — so any user who picked interests through the real UI
always hit an empty set and the query was forced to `0 = 1`. Fixed by matching against both
relations (translating MasterChoice ids to their `Interest` equivalents by name).
`type=146` was never the cause. Bonus fix: `/learn-serve-opportunities/` previously ignored
`match_my_interest` entirely and returned the unfiltered list; it now filters too, so that
endpoint's response **changed** for existing callers passing the flag.

> **Watch:** this filter still returns empty in practice for as long as BE-01 stands —
> there's nothing on the opportunity side to intersect against, regardless of the matching
> logic being correct now. The two are likely the *same* two-relation split seen from
> opposite ends: the fix here translates MasterChoice ids to `Interest` equivalents for the
> **query**, while the detail/list Resources still serialize only `interests` and so show
> nothing. Worth re-reading that fix while looking at BE-01.

> **Open UX question backend raised (not picked up):** whether to disable or annotate the
> toggle when the user has no interests saved at all, since an empty result is otherwise
> indistinguishable from "filter broken".

---

### BE-14 — Certificates never appear for volunteer opportunities

| | |
|---|---|
| **Status** | **Answered — not a bug, and not a timing issue.** |
| **Endpoint** | `GET /user-certificates/` |

Certificates exist **only** for `learn_serve_opportunity`: a manual
`POST /certificates/{registration_id}/` plus a daily `03:30`
`fursa:backfill-missing-certificates` cron, gated on `is_attended` and a
`certificate_type` / `learning_type` eligibility match. `volunteer_opportunity` and `event`
have no certificate mechanism at all — no columns, no model, no route. So "Reeest" (a
`volunteer_opportunity`) will never produce a certificate under the current system, however
long it's been since it ended.

It is **not** gated on `preparation_valid_until_at` / `is_preparation_window_closed`, as this
item originally hypothesised — those fields are unrelated. Backend reproduced the pipeline
end-to-end for an eligible Learn&Serve registration to confirm it isn't stuck.

No frontend change: the certificates tab renders exactly what the endpoint returns, and
empty is the accurate state for this user.

> **Open product question backend raised (not picked up):** surfacing a "pending vs. not
> eligible" distinction on the certificates tab needs a decision on what "pending" would
> even mean for a `volunteer_opportunity`.
