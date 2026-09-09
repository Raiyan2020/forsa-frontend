# Fursa — backend issues & clarifications (single log)

One file for everything the frontend needs from the backend team: bugs, contract questions,
and the answers we've already received. It replaces the per-issue `*_BUG.md` /
`*_CLARIFICATION.md` / `*_HANDOFF.md` docs that used to live in this folder.

**API:** `https://portal.fursa.raiyan.cc/api/` · **Backend:** Laravel ("portal", separate repo) · **Frontend:** `fursa-next` (Next.js 16)

> **Reset 2026-09-08 — round 2 starts here.** Round 1 (BE-01 … BE-18) is archived
> whole in [`BACKEND_ISSUES_ROUND_1.md`](./BACKEND_ISSUES_ROUND_1.md), including **three items
> that were still open** when it was archived: BE-01 (interest tags empty platform-wide),
> BE-17 (learn-serve choice fields `null`) and BE-18 (`filter_type=myevents` returns the whole
> event catalogue). Archiving did not resolve them; all three are copied back into the Open
> section below under their **existing** ids, with the archive retaining the full history.
>
> **Ids are never reused or renumbered** across the reset — the next new item is BE-33. Read
> the archive's header before picking one.

## How to use this file

- Every item has a **permanent id** (`BE-01`, `BE-02`, …). Quote it in replies — "BE-03 is fixed" — instead of a filename.
- Ids are never reused or renumbered. New items take the next free number, whatever section they land in.
- Items move between the two sections as their status changes; the id and the evidence stay put.
- When you fix something, please reply on the item with a concrete request/response pair, not just "done" — every item carries an **Ask** saying exactly what would let us verify it.
- **When you have worked through the open items, send one reply file back.** The exact format is in the next section — please don't skip it, it is how we know whether anything is left for us.

## How to reply — one file back to us

When you have finished the open items in this log (or as many as you are going to do in
this round), hand back **one markdown file**: `BACKEND_REPLY_<YYYY-MM-DD>.md`, in this same
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
| [BE-01](#be-01--legacy-interest-tags-still-need-the-production-backfill) | Legacy interest tags still need the production backfill | opportunity/event detail and list resources | **Open — production** |
| [BE-23](#be-23--interest_ids-is-validated-against-a-table-no-endpoint-exposes-blocking-all-creation) | `interest_ids` rejects every id we can obtain | create/update on opportunities and events | **Open — blocker** |
| [BE-24](#be-24--calendar-controller-exists-but-none-of-its-routes-are-registered) | Calendar controller has no API routes | `/my-calendar/`, `/upload-ics/` | **Open** |
| [BE-25](#be-25--republishing-does-not-have-a-complete-backend-contract) | Republish route/copy semantics are incomplete | event and opportunity create/republish | **Open — blocker** |
| [BE-26](#be-26--three-downloadtrue-flows-ignore-the-export-request) | Three exports return lists instead of files | event, learn-serve, scan permissions | **Open** |
| [BE-27](#be-27--registrations-accept-unapproved-or-private-items-by-id) | Registration ignores approval/visibility | all registration create endpoints | **Open — security** |
| [BE-28](#be-28--event-registration-and-scan-permission-authorization-gaps) | Event registration/permission ownership gaps | event registrations and scan permissions | **Open — security** |
| [BE-29](#be-29--contact-messages-and-sponsor-mutations-are-public) | Sensitive contact/sponsor routes are public | `/contact-us/`, `/sponsors/` | **Open — critical security** |
| [BE-30](#be-30--removing-existing-media-in-the-ui-is-ignored-by-several-update-endpoints) | Existing media removal is ignored | events, posts, replies | **Open** |
| [BE-31](#be-31--sponsor-relations-cannot-be-restored-and-events-have-no-relation-write-api) | Sponsor relation lifecycle is incomplete | opportunity/event sponsors | **Open** |
| [BE-32](#be-32--event-participation-type-is-not-connected-to-registration-behaviour) | Event participation and behavior flags drift | `POST/PATCH /events/` | **Open — contract decision** |
| [BE-17](#be-17--legacy-learn-serve-choice-columns-are-null) | Legacy learn-serve type/format/certificate choices are null | `GET /learn-serve-opportunities/{id}/` | **Open — data/product** |
| [BE-18](#be-18--filter_typemyevents-falls-through-to-the-whole-catalogue) | `filter_type=myevents` returns the whole catalogue | `GET /list-all-opportunities/` | **Open** |
| [BE-21](#be-21--user-certificates-gives-no-way-to-tell-the-two-registration-types-apart) | `/user-certificates/` rows carry no registration type | `GET /user-certificates/`, `GET /download-certificate/` | **Open** |
| [BE-22](#be-22--write-field-names-and-formdata-array-encoding-resolved-in-frontend) | Write names and multipart arrays | frontend forms | Resolved in frontend 2026-09-09 |
| [BE-14](#be-14--volunteer-attendance-is-counted-but-attended-list-and-certificate-are-missing) | Attendance is counted, but Attended list and certificate are missing | attendance, profile activity, and certificate endpoints | Resolved 2026-09-08 |
| [BE-19](#be-19--achievement-report-pdf-export-is-not-implemented-but-answers-key-success) | Report PDF export not implemented, returns `success` | `GET /volunteer-detail/?download=true` | Resolved 2026-09-08 |
| [BE-20](#be-20--event-details-returns-event_type_display-null) | Event details returns `event_type_display: null` | `GET /events/{id}/` | Answered 2026-09-08 |

---

# Open

### BE-01 — Legacy interest tags still need the production backfill

| | |
|---|---|
| **Status** | Open — backend code exists; production operation is still pending |
| **Endpoint** | Opportunity/event detail and list resources |
| **Frontend** | `lib/interests.ts` and all opportunity/event cards and details |
| **Raised** | Reopened from Round 1 on 2026-09-09 |

Round 1 proved that migrated assignments live in legacy MasterChoice pivots while current
resources read the newer `Interest` pivots. Backend added the idempotent command
`php artisan fursa:backfill-legacy-opportunity-interest-tags`, but it has not been run against
the live database. Live responses therefore still return empty `interests` /
`interest_display` arrays.

**Ask.** Run the command in production, report its inserted/skipped counts, then return
`GET /opportunities/97/details/` showing its three historical tags (legacy ids 71, 74 and 80,
translated to canonical Interest rows). This is independent of the new-write defect in BE-23.

**Frontend status.** `normalizeInterests()` already accepts either response field; no change
is needed after the backfill.

---

### BE-23 — `interest_ids` is validated against a table no endpoint exposes, blocking all creation

| | |
|---|---|
| **Status** | Open — **blocker**, all three create forms |
| **Endpoint** | `POST/PATCH /volunteer-opportunities/`, `/learn-serve-opportunities/`, `/events/` |
| **Frontend** | `features/opportunities/components/{VolunteerForm,LearnServeForm}.tsx`, `features/events/components/EventForm.tsx`, `features/shared/interestIdsFallback.ts` |
| **Raised** | 2026-09-09 |

**What we send / What we get.** Creating a volunteer opportunity, 2026-09-09:

```
POST /volunteer-opportunities/
  gender_id=59  volunteer_category=charity
  interest_ids[]=71  interest_ids[]=84  interest_ids[]=85  interest_ids[]=72
  interest_ids[]=73  interest_ids[]=86  interest_ids[]=87  interest_ids[]=74

422 {"key":"fail","code":422,"response_status":{"validation_errors":{
      "interest_ids.0":["القيمة المحددة interest_ids.0 غير موجودة."],
      … .1 … .7 — one per id, all eight
    }}}
```

**First, the good news — this response confirms BE-22.** `interest_ids[]` was parsed into
`interest_ids.0 … .7`, so the bracketed array encoding and the `interest_ids` name are both
right. `gender_id=59` and `volunteer_category=charity` passed validation, confirming the
`*_id` rename *and* that `volunteer_category` is correctly a bare enum. BE-22's asks 1 and 3
are answered by this one response; only the `existing_image_ids` half is still open.

**Why it's wrong.** Those eight ids are not invented — they are exactly what your own choices
endpoint serves:

```
GET /choices/volunteer_opportunity_interest/
  → 18 rows, ids 71–88:  71 Community Service, 72 Arts & Creativity, 73 Local Emergencies,
                         74 Event Management & Organization, … 88 Religious
```

Every interest picker in the app is fed from `/choices/{context}_interest/` — so they are all
**MasterChoice** ids: volunteer 71–88, event 110–132 (`event_interest`), profile 133–142
(`user_interest`). But `interest_ids` is validated with an `exists` rule against the
**`Interest`** table, and **no endpoint exposes that table's ids** — `/interests/`,
`/master-interests/`, `/choices/interest/` and `/choices/opportunity_interest/` all 404.

So the frontend cannot construct a payload this rule can accept. There is no id we could send.

**This is BE-01's root cause, and it means BE-01's fix is incomplete.** Every live record still
reads `interest_display: []`:

```
GET /list-volunteer-opportunities/?limit=5
  → ids 130, 98, 97, 12, 13 — interest_display: [] on all five
```

Before we renamed the field it was posted as `_interests`, which your reply confirmed no
controller reads ("no write path, admin or API, has ever touched the MasterChoice pivots").
So the write side has **never** worked: the tags are empty because nothing was ever stored,
not because the stored values need bridging. A backfill that translates legacy MasterChoice
pivots to `Interest` rows will therefore find nothing for any record created through this UI —
and the next record created will be just as empty.

**Blast radius.** All three forms require at least one interest (`Yup.array().min(1)`), and all
three now send `interest_ids[]`. Without the temporary retry documented below, **no volunteer
opportunity, learn & serve opportunity or event can be created or updated at all** while this
stands.

**Ask.**

1. **Accept MasterChoice ids on `interest_ids` and bridge them to `Interest` by name** — the
   same translation you have already written twice: once for BE-13's `match_my_interest` filter
   fix, once for BE-01's backfill command. This is our preference: no frontend change, and it
   preserves the three curated per-context vocabularies (18 volunteer, 24 event, 10 profile)
   that `/choices/` already serves and that the pickers are designed around.
2. If you would rather we send `Interest` ids instead, expose that table — `/choices/interest/`
   or similar — and say whether it is one shared list or per-context. Be aware this changes
   *which tags a user can pick*, so it needs a product call, not just a repoint.
3. Either way, please confirm what `interest_ids` should contain for **all three** resource
   types, since the pickers currently use three different choice types.
4. To verify: one successful `POST /volunteer-opportunities/` with interests set, and the
   `interest_display` from reading that record back — non-empty. That closes this write-path
   item; BE-01 closes separately after the production legacy-data backfill is verified.

**Frontend status — interim workaround in place, and it self-heals.**
`features/shared/interestIdsFallback.ts` sends the correct payload first; if the response is a
422 whose validation errors are *only* `interest_ids.*`, it retries once without the tags and
warns the user that the tags were not applied. Creation is unblocked, nothing is written
silently incomplete, and the moment you accept the ids the first attempt succeeds and the
warning stops appearing — there is no flag for us to remember to switch off. The retry is safe
because Laravel validates before it writes, so the 422 leaves nothing created.

Delete-on-close: that module exists only for this item.

---

### BE-22 — Write field names and `FormData` array encoding (resolved in frontend)

| | |
|---|---|
| **Status** | **Resolved in frontend 2026-09-09 — no backend action requested** |
| **Endpoint** | `POST/PATCH /events/`, `/volunteer-opportunities/`, `/learn-serve-opportunities/`, `/volunteer-profile/`, `/organization-profile/`, `/account/`, `/register/` |
| **Frontend** | event/opportunity/profile/community multipart forms |
| **Raised** | 2026-09-09 |

The backend source in this workspace and a live 422 settle the contract: event/opportunity
relations use canonical `*_id` names, `volunteer_category` is an enum, profile controllers
accept canonical `interest_ids`, and Laravel arrays must use bracketed multipart keys. Frontend
now sends `interest_ids[]`, `existing_image_ids[]`, `existing_ids[]`, `new_documents[]`, and
`images[]` where the backend validates arrays. The unused volunteer
`opportunity_nationality` field was removed; the supported `is_kuwaitis` boolean remains.

The remaining interest-id value mismatch is not part of this item; it is BE-23. Media endpoints
that ignore correctly encoded `existing_image_ids[]` are BE-30.

<details>
<summary>Original investigation (retained for audit history)</summary>

Two separate questions, both about **write** payloads. Every `_display` field you send on read
is unambiguous; what we have never had in writing is the name to send it back under, and we
have been guessing per field.

**1. Relation ids: bare name or `*_id`?**

We have just changed the three create/update forms to send `*_id` for every MasterChoice
relation, because **BE-20 looks like a symptom of getting this wrong**: the event form was
sending `event_type`, you validate and store `event_type_id`, so the value was dropped on
every save and event 19's `NULL` is what that produces. If that reading is right, the same was
true of `participation_type`, `gender`, `format`, `learning_type` and `certificate_type` on
their respective forms — all silently discarded on every create and update.

Now sending (was → is):

| Endpoint | Was | Now |
|---|---|---|
| `/events/` | `event_type`, `participation_type`, `gender`, `_interests` | `event_type_id`, `participation_type_id`, `gender_id`, `interest_ids[]` |
| `/volunteer-opportunities/` | `gender`, `_interests` | `gender_id`, `interest_ids[]` |
| `/learn-serve-opportunities/` | `format`, `gender`, `_interests`, `certificate_type`, `learning_type` | `format_id`, `gender_id`, `interest_ids[]`, `certificate_type_id`, `learning_type_id` |

**Please confirm this is right before we ship it** — if these endpoints actually accepted the
bare names, we have just broken all three forms.

Deliberately **not** changed, and we would like each confirmed rather than assumed:

- `volunteer_category` on `/volunteer-opportunities/` stays bare. Its `_display` is `{en, ar}`
  with no `id`, unlike every relation above, so we read it as a fixed enum. Correct?
- The profile and registration endpoints still send **bare** `gender`, `_interests`, `sector`,
  `organizer_type` and `emergency_contact_relationship`, even though all five read back as
  id-bearing `*_display` objects. We left them alone because there is positive evidence they
  work: BE-13 established that `PATCH /volunteer-profile/` with `_interests` does write (to
  `masterInterests`), and organizations plainly do end up with a populated
  `organizer_type_display`. So these endpoints appear to accept a different vocabulary from the
  three above. Is that deliberate, and is it stable?

**2. Array encoding — `field` repeated, or `field[]`?**

This one we have *not* touched, because guessing wrong makes it worse rather than better. The
same request currently mixes both conventions:

```
formData.append("interest_ids[]", id)          // repeated, bracketed
formData.append("existing_image_ids", id)      // repeated, bare
```

PHP does not build an array from a repeated **bare** key — `a=1&a=2` leaves `$_POST['a']` as
`"2"`. So if `existing_image_ids` is meant to be a list, you have only ever received the last
id, and editing an opportunity that had three images would keep one and drop two. Three fields
are in that shape: `existing_image_ids` (all three forms plus the three community forms),
`existing_ids` (organizer documents), and `images` (`ReplyOfReplyForm`).

We are not switching them to `[]` on our own, because the failure mode flips: if you read a
scalar, `existing_image_ids[]` arrives as nothing and we would drop *every* image instead of
keeping one.

**Ask.**

1. Confirm or correct the rename table above, per endpoint. If any of those endpoints accepts
   both vocabularies, say which one is canonical so we stop shipping the other.
2. For each of the three list fields — `existing_image_ids`, `existing_ids`, `images` — state
   whether you read a repeated bare key or a bracketed one, and we will match it exactly.
3. Confirm `volunteer_category` is an enum and not a relation.
4. **A `422` for an unknown write key would have caught all of this.** Every one of these
   fields was accepted with a `200` and silently ignored — the same complaint as BE-15's
   unknown `opportunity_type` and BE-18's unknown `filter_type`. That is three rounds of the
   same root cause. Please consider rejecting unrecognised keys on write endpoints, or at
   minimum on these.
5. To verify: create one event through the API with `event_type_id` set, and give us back the
   stored `event_type_id`. And one opportunity update sending three `existing_image_ids`,
   with the resulting image count.

**Frontend status.** The rename is applied and the tree typechecks and builds.

> **Partly answered 2026-09-09 by a live 422 — see [BE-23](#be-23--interest_ids-is-validated-against-a-table-no-endpoint-exposes-blocking-all-creation).**
> A real `POST /volunteer-opportunities/` came back rejecting only the interest *values*, which
> means the names and encoding were accepted: `interest_ids[]` parsed into `interest_ids.0…7`,
> and `gender_id` plus a bare `volunteer_category` both passed. **Asks 1 and 3 are settled for
> that endpoint** — the `*_id` rename is correct and `volunteer_category` is an enum. Ask 2
> (`existing_image_ids` array encoding) is still open and untouched, and asks 1/3 are still
> unconfirmed for `/events/` and `/learn-serve-opportunities/` specifically, though the same
> contract almost certainly applies.

</details>

---

### BE-24 — Calendar controller exists but none of its routes are registered

| | |
|---|---|
| **Status** | Open |
| **Endpoint** | `GET /my-calendar/`, `POST /my-calendar/save/`, `PATCH/DELETE /my-calendar/{id}/`, `POST /upload-ics/` |
| **Frontend** | `features/calendar/` |
| **Raised** | 2026-09-09 |

`CalendarController` implements `index`, `store`, `update`, `destroy` and `uploadIcs`, but the
authenticated `// Calendar` block in `routes/api.php` is empty. The calendar page and iPad ICS
flow therefore call routes Laravel never registers.

**Ask.** Import the controller and register all five authenticated routes above (or return the
canonical paths if different). Add route tests proving user scoping for update/delete and a
successful ICS upload. The frontend already supports the controller's actual generic `type`
values (`Volunteer`, `Learn`, `Event`), null times and duplicate sources.

---

### BE-25 — Republishing does not have a complete backend contract

| | |
|---|---|
| **Status** | Open — blocks reliable republishing |
| **Endpoint** | `POST /event/republish/{id}` and opportunity create/update endpoints |
| **Frontend** | `EventForm.tsx`, `VolunteerForm.tsx`, `LearnServeForm.tsx` |
| **Raised** | 2026-09-09 |

There are three connected gaps:

1. The event form correctly calls the requested `POST /event/republish/{id}`, but no such route
   or controller action exists.
2. Volunteer and learn-serve reposting creates a new record and sends `opportunity_id`,
   `existing_image_ids[]`, and either `license_image` or `license_image_removed`. Their API
   validators/controllers accept none of the licence/copy fields, even though both models have
   `license_image`.
3. Existing gallery URLs shown in repost mode are not files and the create actions do not clone
   the referenced image rows, so a repost can lose both the licence and gallery unless every
   file is selected again.

**Ask.** Implement one explicit, ownership-protected republish contract for each type. A repost
must create a new pending record, copy selected gallery images and the existing licence when no
replacement is uploaded, never mutate the source, and return the new id. For events, keep the
path already agreed with frontend: `POST /event/republish/{id}`. Document the accepted multipart
fields and add tests for copy, replace, remove, unauthorized source, and source immutability.

---

### BE-26 — Three `download=true` flows ignore the export request

| | |
|---|---|
| **Status** | Open |
| **Endpoint** | `GET /event-registrations/`, `GET /learn-serve-opportunities/{id}/registrations/`, `GET /scan-permissions/list/` |
| **Frontend** | the three organizer registration/permission tables |
| **Raised** | 2026-09-09 |

All three screens request `download=true`; the controllers ignore it and return normal JSON
lists. Only `VolunteerOpportunityRegistrationController::downloadRegistrations()` currently
implements the expected XLSX flow. This used to produce a false success toast; the frontend now
fails visibly when `downloadUrl` is absent.

**Ask.** Add creator-owned XLSX export branches to the three endpoints, using the established
standard envelope:

```json
{ "key": "success", "data": { "downloadUrl": "https://…xlsx" } }
```

Apply the same search/status filters as the visible table. If `mark_attendance` is retained,
make its side effect explicit and idempotent; otherwise reject that parameter. Return one proof
request/response for each endpoint plus authorization tests.

---

### BE-27 — Registrations accept unapproved or private items by id

| | |
|---|---|
| **Status** | Open — security/data-integrity |
| **Endpoint** | `POST /volunteer-opportunity-registrations/`, `POST /learn-serve-opportunity-registrations/`, `POST /event-registrations/` |
| **Frontend** | all volunteer registration dialogs |
| **Raised** | 2026-09-09 |

Each create action loads any `notDeleted()` record by id and then calls
`isRegistrationOpen()`. That helper only checks manual closure and due/end dates; it does not
require `approval_status=approved`, and the volunteer path does not require `is_public=true`.
Someone who guesses an id can therefore register for a pending/rejected/private item that the
public catalog correctly hides.

**Ask.** Centralize registration eligibility and enforce it server-side for all three types:
approved, visible to that user, not deleted, registration open, not full, and a valid lifecycle
state. Return 403/404 without revealing private records. Add negative feature tests for pending,
rejected and private records; frontend checks are not a security boundary.

---

### BE-28 — Event registration and scan-permission authorization gaps

| | |
|---|---|
| **Status** | Open — security/data-integrity |
| **Endpoint** | `GET/PATCH /event-registrations/{id}/`, event registration create, `GET /scan-permissions/list/?event_id=` |
| **Frontend** | `EventRegisterList.tsx`, `ScanPermission.tsx` |
| **Raised** | 2026-09-09 |

Confirmed in source:

- `EventRegistrationController::show()` returns any registration id to any authenticated user;
  unlike update/delete it has no owner-or-organizer authorization check.
- create and update validate only `exists:event_time_slots,id`; they never require that the
  time slot belongs to the registration's event.
- `ScanPermissionController::list()` verifies ownership for `opportunity_id` but has no
  equivalent event-owner check for `event_id`, exposing an event's permitted-user list.

**Ask.** Apply owner/organizer policies consistently, validate event/time-slot ownership on
both create and update, and add cross-account/cross-event tests that return 403/422. Do not rely
on ids being hard to guess.

---

### BE-29 — Contact messages and sponsor mutations are public

| | |
|---|---|
| **Status** | Open — **critical security** |
| **Endpoint** | `GET/PUT/PATCH/DELETE /contact-us[/id]/`; `PUT/PATCH/DELETE /sponsors/{id}/` |
| **Frontend** | public contact and sponsor pages |
| **Raised** | 2026-09-09 |

These routes sit outside `auth:api`, and neither controller performs authorization. An
unauthenticated caller can list contact submissions (names, emails and messages), read one,
modify it or delete it. The same caller can modify/delete sponsors. Public `POST /contact-us/`
and sponsor application creation may be intentional; public administration is not.

**Ask.** Move sensitive routes behind authenticated staff/admin authorization. Keep only the
intentionally public create/list/detail operations public, and rate-limit/abuse-protect public
submission routes. Add unauthenticated and non-staff 401/403 tests for every protected method.

---

### BE-30 — Removing existing media in the UI is ignored by several update endpoints

| | |
|---|---|
| **Status** | Open |
| **Endpoint** | `PATCH /events/{id}/`, `PATCH /posts/{id}/`, `PATCH /replies/{id}/` |
| **Frontend** | event and community edit forms |
| **Raised** | 2026-09-09 |

The forms send `existing_image_ids[]` as the keep-set and send new files, but these controllers
only add files. They never validate/use the keep-set and never soft-delete rows removed in the
UI. The saved record therefore restores the supposedly deleted media on the next fetch.

Volunteer and learn-serve forms now use their existing owner-protected
`DELETE /delete-opportunity-image/` endpoint as a frontend workaround; events/posts/replies have
no equivalent contract.

**Ask.** Either implement keep-set semantics transactionally on update, or expose explicit
owner-protected delete endpoints. Define omission versus an empty array clearly, prevent ids
from another parent being deleted, clean storage safely, and prove removal of one among three
images for each resource.

---

### BE-31 — Sponsor relations cannot be restored, and events have no relation write API

| | |
|---|---|
| **Status** | Open |
| **Endpoint** | opportunity sponsor POST/DELETE; event create/update/detail |
| **Frontend** | the sponsor pickers in all three forms |
| **Raised** | 2026-09-09 |

For volunteer/learn-serve, delete soft-deletes the relation, but add checks `exists()` without a
`notDeleted()` constraint. Removing an organization and choosing it again is therefore rejected
forever as “already a sponsor.” The add action also ignores the UI's `position` field.

Events already have `event_sponsor_images.organization_id` and `position` columns, but no API
for syncing organization relations. The form's
`event_sponsor_images_organization_N`/`event_sponsor_images_position_N` fields are ignored, and
the website detail resource omits `organization`, so edit mode cannot even restore selections.

**Ask.** Restore/upsert a soft-deleted opportunity relation (or exclude it from duplicate
checks), accept/persist position, and return ordered active relations. Add equivalent
owner-protected add/remove/sync behavior for events and include
`organization: {id, full_name, profile_pic}` plus `position` in event details. Test remove then
re-add for all types.

---

### BE-32 — Event participation type is not connected to registration behaviour

| | |
|---|---|
| **Status** | Open — contract/product decision required |
| **Endpoint** | `POST/PATCH /events/`, `GET /events/{id}/` |
| **Frontend** | `EventForm.tsx`, `EventDetails.tsx` |
| **Raised** | 2026-09-09 |

The form chooses `participation_type_id` from values such as `Paid Event`, `Free Event`, and
`Free Event (Registration Required)`, but does not collect/send the separate backend fields
`registration_required`, `paid_registration`, `registration_fee`, `participants_needed`, or
`attendance_type_id`. The backend stores no derivation from the selected choice. Detail buttons,
capacity, payment and registration endpoints rely on those separate flags, so two parts of the
same record can disagree.

**Ask.** Define one canonical contract: either derive/validate the behavior flags server-side
from `participation_type_id`, or expose all required controls and consistency rules for the
frontend. State the exact mapping for every participation choice, including whether registration
is internal or through `registration_link`, capacity rules, paid fee, and time-slot attendance.
Reject inconsistent combinations and return a test matrix. Frontend will implement the chosen
contract once it is explicit; guessing would create incorrect payment/registration behavior.

---

### BE-17 — Legacy learn-serve choice columns are null

| | |
|---|---|
| **Status** | Open — existing-data/product decision |
| **Endpoint** | `GET /learn-serve-opportunities/{id}/` |
| **Frontend** | `LearnServeDetails.tsx`, `LearnServeForm.tsx` |
| **Raised** | Reopened from Round 1 on 2026-09-09 |

Backend previously confirmed that `learning_type_id`, `format_id` and `certificate_type_id`
are genuinely null on affected migrated rows (for example opportunity 30), not merely omitted
by the resource. This blanks the type/certificate and can falsely render format as Online. New
frontend writes now use the correct `learning_type_id`, `format_id` and `certificate_type_id`,
so this is an existing-data and requiredness problem.

**Ask.** Make `learning_type_id` and `format_id` required on create (and certificate type when
the selected learning type requires it), return the raw ids alongside display objects, and agree
a one-time repair policy for null legacy rows rather than guessing their values. Keep
`requires_check_in` authoritative until repaired. Full prior evidence remains under BE-17 in
`BACKEND_ISSUES_ROUND_1.md`.

---

### BE-18 — `filter_type=myevents` falls through to the whole catalogue

| | |
|---|---|
| **Status** | Open |
| **Endpoint** | `GET /list-all-opportunities/?filter_type=myevents` |
| **Frontend** | achievement/profile event lists |
| **Raised** | Reopened from Round 1 on 2026-09-09 |

The unsupported/unhandled value returns the unfiltered platform event catalogue with HTTP 200.
The frontend removed it from the achievement query to prevent attributing strangers' events to
the current volunteer, but that leaves volunteers with no endpoint for events they registered
for or attended.

**Ask.** Either implement `myevents` as the volunteer's registered/attended events and document
the rule, or reject it with 422 and expose a correctly named equivalent. Unknown `filter_type`
values must never fall through to an unscoped list. Prove with a user whose expected registered
and attended event ids are known. Full reproduction is archived under BE-18 in
`BACKEND_ISSUES_ROUND_1.md`.

---

### BE-21 — `/user-certificates/` gives no way to tell the two registration types apart

| | |
|---|---|
| **Status** | Open |
| **Endpoint** | `GET /user-certificates/?user_id=`, `GET /download-certificate/` |
| **Frontend** | `features/profile/components/ProfileDescriptionTabs.tsx` (`CertificateTabs`), `features/profile/services/profileApi.ts` |
| **Raised** | 2026-09-08 |

**What we get.** Per BE-14, `/user-certificates/` now unions both registration types and each
row is:

```json
{
  "registration_id": 996,
  "certificate_image": "https://…",
  "opportunity__title_en": "…",
  "opportunity__title_ar": "…",
  "organizer_name": "…"
}
```

**Why it's wrong.** In the same reply you told us two things that don't fit together:

1. Pass `registration_type` to `/download-certificate/` "when you already know which type a
   given id is", because the two registration tables have independent id sequences and *"they
   can, in principle, collide"*.
2. The rows this list returns carry no field saying which table they came from.

So the one screen that lists certificates is exactly the screen that cannot supply the
disambiguator. Every download from the certificates tab has to fall through to the
learn-serve-first search order — the path you warned us about. On a collision the volunteer
downloads someone else's certificate, and nothing in either response would reveal it.

**Ask.**

1. Add `registration_type` (`volunteer` | `learn_serve`) to each `/user-certificates/` row.
   We already read the field opportunistically and pass it straight through, so this needs no
   further frontend change once it appears.
2. Alternatively, if you would rather not change that shape: confirm whether ids actually can
   collide in practice. If the two sequences are in fact disjoint, say so plainly and we will
   drop the param and stop worrying about it.
3. To verify: one `/user-certificates/` response for a user holding certificates of both types
   showing the new field, plus a `/download-certificate/` call for each using it.

**Frontend status.** `downloadUserCertificate` already accepts the optional param and the
certificate row type already declares `registration_type` — both no-ops until the field
exists. Nothing to change on our side when it lands.

---

# Answered / Resolved

_Answered this round, kept for the record. Reopen one by moving it back up with a dated note.
Round 1's items are in [`BACKEND_ISSUES_ROUND_1.md`](./BACKEND_ISSUES_ROUND_1.md)._

### BE-14 — Volunteer attendance is counted, but Attended list and certificate are missing

| | |
|---|---|
| **Status** | **Resolved 2026-09-08.** Built as specified; frontend switched over. Three follow-ups left open inside the reply block, one of them ours (BE-21). |
| **Endpoints** | `POST /volunteer-attendance/manual/`; `PATCH /volunteer-attendance/{attendance_id}/hours/`; `GET /list-user-opportunities/`; `GET /user-certificates/`; `GET /download-certificate/` |
| **Frontend** | `/volunteerlist`; `/volunteer-profile` → Opportunities → Registered / Attended and Certificates; `features/profile/components/ProfileDescriptionTabs.tsx`; `features/profile/components/ProfileVolunteerCard.tsx`; `features/profile/services/profileApi.ts` |
| **Raised** | Originally answered in Round 1; reopened with a complete live reproduction on 2026-09-08 |

**Why this keeps its old id.** Round 1's BE-14 asked why certificates never appeared for
volunteer opportunities. Backend answered that certificates exist **only** for
`learn_serve_opportunity`: volunteer opportunities have no certificate columns, model,
generation route or backfill path. This reproduction is the same gap, now raised as a
feature requirement rather than a timing question, so the permanent id remains BE-14.

**Reproduction — one registration reaches attendance and hours, then stops before profile
history/certification.** Two accounts were used:

- An entity account created volunteer opportunity **113**, `"Reeest"`.
- The personal/volunteer account for **Ahmed Abdullah** registered for it. Its registration
  id is **996**.
- After the opportunity ended, the entity marked that registration attended through the
  manual-attendance flow.

Step 1 — manual attendance succeeds:

```http
POST /api/volunteer-attendance/manual/
Authorization: Token <entity token>
```

```json
{
  "key": "success",
  "code": 200,
  "response_status": { "error": false, "validation_errors": [] },
  "data": {
    "id": 768,
    "registration_id": 996,
    "attended_date": "2026-09-08",
    "total_hours": 1,
    "is_attended": true,
    "volunteer_name": "Ahmed Abdullah",
    "opportunity_id": 113,
    "opportunity_title_en": "Reeest",
    "opportunity_title_ar": "Reeest"
  }
}
```

Step 2 — the entity changes the attendance hours to 24:

```http
PATCH /api/volunteer-attendance/765/hours/
Content-Type: application/json

{ "total_hours": 24 }
```

The captured response is:

```json
{
  "key": "success",
  "code": 200,
  "response_status": { "error": false, "validation_errors": [] },
  "data": {
    "id": 768,
    "registration_id": 996,
    "attended_date": "2026-09-08",
    "total_hours": 24,
    "is_attended": true,
    "volunteer_name": "Ahmed Abdullah",
    "opportunity_id": 113,
    "opportunity_title_en": "Reeest",
    "opportunity_title_ar": "Reeest"
  }
}
```

There is an id-integrity question in that capture: the URL names attendance **765**, while
both responses identify the persisted attendance as **768**. If `765` in the URL is only a
copied/request-log typo, say so in the reply. If it is accurate, this endpoint resolved or
updated a different record from the one named in its path, which must be fixed before it is
safe to use for certificate hours.

Step 3 — the volunteer's all-time hours move from **23 to 47**, exactly +24. This proves the
attendance record is attached to the personal account and participates in the aggregate;
the problem is not a missing volunteer relationship or an uncounted hours update.

Step 4 — the completed opportunity is also recognisable as attended in the profile-list
resource. The attached response from:

```http
GET /api/list-user-opportunities/?search=&page=1&limit=9&filter_type=registered&opportunity_type=&opportunity_status=
Authorization: Token <personal volunteer token>
```

contains:

```json
{
  "id": 113,
  "opportunity_type": "volunteer_opportunity",
  "opportunity_status": "completed",
  "is_registered": true,
  "action_state": "ended",
  "relationship_tags": ["registered", "attended"],
  "profile_activity_tag": "attended"
}
```

So all three backend facts already agree: registration 996 exists, attendance 768 is true
with 24 hours, and opportunity 113 is tagged `attended` for this profile.

**Two user-visible results are still missing.**

1. **The Attended tab is empty.** The empty response observed from the Attended tab is a
   success envelope with `data: []` and `meta.pagination.total: 0`. The request URL pasted
   with that response repeats `filter_type=registered`, so it does not establish the actual
   second filter. The current frontend implementation is useful evidence here: for the tab
   labelled **Attended**, both the React and Next versions send
   `GET /list-user-opportunities/?filter_type=organized`. That legacy name cannot naturally
   mean both "opportunities this profile organized" and "opportunities this volunteer
   attended". For a personal account that attended an entity-owned opportunity, an actual
   organizer filter correctly returns nothing — but then there is no API query for the
   Attended tab even though the row already says `profile_activity_tag: "attended"`.

2. **The Certificates tab is empty.** `GET /user-certificates/?user_id=<Ahmed's volunteer
   user id>` does not expose registration 996, so the existing frontend has nothing it can
   render or download. This matches backend's Round 1 explanation: there is currently no
   certificate mechanism at all for `volunteer_opportunity`. Waiting longer or refetching
   cannot fix it.

One timing detail must be designed rather than guessed: opportunity 113 ended on
**2026-09-07**, but the organizer's attendance screen showed its preparation/check-in
window remaining open until **2026-09-13 02:59 AM**. Attendance hours can be corrected
during that window, as this reproduction demonstrates. A certificate that prints hours
cannot safely be treated as final merely because `opportunity_status` became `completed`;
backend must define whether issuance waits for the preparation window to close or uses an
explicit organizer finalisation action.

**Root-cause / scope (confirmed, not a hypothesis).** Per the Round 1 backend answer, the
certificate half is missing product functionality: only Learn & Serve registrations enter
the certificate pipeline. The profile-history half is an undefined/misaligned list
contract: the backend already calculates `attended`, while the frontend inherited
`filter_type=organized` for an Attended-labelled tab because no explicit attended filter
was documented.

**Ask.**

1. Add an explicit attended-list contract for volunteer profiles. The clearest contract is:

   ```http
   GET /list-user-opportunities/?filter_type=attended
   ```

   It must return opportunity 113 for Ahmed's personal account. If backend deliberately
   intends another value (including legacy `organized`), document the exact accepted value
   and make its semantics unambiguous. Also state whether `registered` includes historical
   attended rows or whether Registered and Attended are intended to be disjoint tabs.
2. Implement certificate support for **`volunteer_opportunity`** registrations. Manual and
   QR attendance must enter the same idempotent issuance pipeline; the attendance method
   must not affect eligibility.
3. Define the eligibility and trigger precisely. At minimum address: completed opportunity,
   active registration, `is_attended: true`, positive/final `total_hours`, and whether the
   preparation/check-in window must close or an organizer must explicitly finalise it.
4. Define what happens when hours are corrected after a certificate is generated. The
   certificate must not permanently display the original 1 hour after attendance 768 is
   corrected to 24; either delay generation until hours are final or regenerate/version the
   certificate deterministically.
5. Make generation retry-safe and unique per eligible registration. Repeated cron/jobs or
   requests must not create duplicate certificates for registration 996.
6. Backfill existing eligible volunteer registrations, including registration **996**, so
   this feature does not work only for attendance recorded after deployment.
7. Keep the current frontend certificate contract or document the exact replacement:

   ```http
   GET /user-certificates/?user_id=<volunteer user id>
   GET /download-certificate/?registration_id=996
   ```

   The list entry currently expected by the UI is:

   ```json
   {
     "registration_id": 996,
     "certificate_image": "<absolute URL>",
     "opportunity__title_en": "Reeest",
     "opportunity__title_ar": "Reeest"
   }
   ```

   If certificates become PDF rather than images, or if the fields/endpoint change, state
   the MIME type, response shape, URL lifetime and download mechanism explicitly.
8. Audit the attendance-hours id mismatch. Prove that
   `PATCH /volunteer-attendance/{attendance_id}/hours/` can only update and return that same
   attendance id, or confirm that `765` was a capture typo and `768` was the real request.
9. Verification for this exact reproduction:
   - an attended-list request whose returned ids include `113`;
   - `/user-certificates/` showing a certificate for registration `996`;
   - `/download-certificate/?registration_id=996` returning the real file and correct MIME
     type;
   - the certificate showing the final **24 hours**, not the original 1 hour;
   - the volunteer's total remaining **47**, with no double-counting from backfill or retry.
10. **Return one backend markdown file explaining the implemented feature and contract:**
    `BACKEND_REPLY_<YYYY-MM-DD>.md`, with a `BE-14` section. Include the database/model
    changes, issuance trigger/job or command, eligibility rules, idempotency key, backfill
    command and whether it has run in production, attended-filter value, certificate
    list/download response examples, and the five verification results from ask 9. Also
    name every exact frontend change still required. Do not answer this item only with
    "done" or with screenshots.

**Frontend status.** No speculative change yet. The Certificates tab already renders
`GET /user-certificates/` and downloads by `registration_id`; it will display registration
996 as soon as backend emits the existing shape. The Attended tab currently sends the
legacy `filter_type=organized`; we will replace it with the backend's documented attended
filter as soon as ask 1 is answered. Attendance entry, hours editing and aggregate display
are already working for this reproduction.
## Backend reply — 2026-09-08, frontend done

**`filter_type=attended` now exists** on `/list-user-opportunities/` and is the going-forward
name. The key detail: `organized` on *this* endpoint never filtered by `created_by` — it
already meant "completed opportunity + at least one attended registration", i.e. it was
attended logic wearing the wrong name. Both values run the identical query, so the rename is
safe, and `registered` stays a strict superset (every `attended` row is also `registered`).

**Certificates for `volunteer_opportunity` are built**: issued and emailed automatically when
the opportunity completes (hooked into `fursa:advance-statuses`), plus
`POST /volunteer-opportunities/{id}/certificates/send/` for attendance marked *after* that
automatic pass. It answers `{"certificates_sent": N}` and is idempotent — `0` on a repeat
call. Hours printed are the sum of attended rows at issuance time. Certificates are HTML,
like Learn&Serve's, not PDF.

**Frontend done.**
- The Attended tab and the achievement report both send `attended` now.
  `ProfileVolunteerCard` maps at the request layer rather than renaming its prop, because the
  same `filter_type` prop also drives that card's styling *and* the legacy
  `/list-all-opportunities/` path — where `organized` genuinely does mean created-by-me. The
  mapping is commented so the two meanings don't get merged later.
- "Send Certificates" added to the creator's manage-action column on the volunteer
  opportunity detail screen, shown only while `opportunity_status === "completed"`.
  `certificates_sent: 0` is surfaced as an info toast, not an error — it is a normal answer.
- `downloadUserCertificate` takes an optional `registration_type`.

> **Open, ours — raised as BE-21:** we cannot actually *pass* `registration_type` from the
> certificates tab, because `/user-certificates/` doesn't say which table a row came from.

> **Open, yours — re-issue after an hours correction.** You flagged that a corrected
> `total_hours` leaves an already-issued certificate showing the original number. We do want
> the re-issue path (clearing `is_certified` when `total_hours` changes, as you suggested) —
> a certificate stating the wrong hours is worse than a late one. Not urgent, but please
> don't close it silently.

> **Open, yours — the backfill has not been run.** `fursa:backfill-missing-volunteer-certificates`
> still needs executing against the live database, including registration 996. Same
> outstanding action as round 1's interest-tags backfill; nothing on our side can verify this
> item until it runs.

> **Not needed:** `/certificate/preview/{registration_id}/` staying Learn&Serve-only is fine,
> no frontend reads it.

> **Attendance-id mismatch (765 vs 768) — accepted.** Your reading of `updateHours()` is
> right and we're not pursuing it as an API bug. If it recurs we'll capture both requests'
> timestamps and check for a concurrent check-in first.

---


### BE-19 — Achievement report PDF export is not implemented, but answers `key: "success"`

| | |
|---|---|
| **Status** | **Resolved 2026-09-08, frontend switched over.** Streamed-bytes contract, not a URL. |
| **Endpoint** | `GET /volunteer-detail/?download=true` |
| **Frontend** | `features/achievements/components/AchievementReports.tsx` (the "تصدير التقرير" / "Export Report" button), `features/achievements/services/achievementsApi.ts` (`downloadVolunteerDetail`) |
| **Raised** | 2026-09-08 |

**What we send / What we get.** Clicking "Export Report" on `/achievement-reports`:

```
GET /volunteer-detail/?download=true
Authorization: Token <volunteer token>

200 {
  "key": "success",
  "msg": "إنشاء PDF غير متوفر بعد.",
  "code": 200,
  "response_status": { "error": false, "validation_errors": [] },
  "data": {
    "pdf_url": null,
    "message": "PDF generation is not yet implemented."
  }
}
```

**Why it's wrong.** Two separate things, and the second one is the one that costs us.

1. **The feature does not exist.** The export button is shipped and reachable by every
   volunteer on `/achievement-reports`, and there is no backend behind it. Nothing on our
   side can make it work.

2. **It is reported as a success.** `key: "success"`, `code: 200`,
   `response_status.error: false` — by this API's own envelope contract that is a *successful*
   response, so every generic success/failure check in our client passes. The only indication
   that anything is missing is `pdf_url: null` plus an English prose sentence in
   `data.message`. We are not going to branch on `"PDF generation is not yet implemented."` by
   string-matching it: that breaks the moment the wording or the language changes, and it
   makes "not implemented", "generation failed" and "generated but the URL is missing" three
   states we cannot tell apart.

**Root-cause hypothesis (Laravel).** Not a regression — the `download=true` branch of the
`volunteer-detail` controller looks like a stub that early-returns a literal placeholder
payload instead of rendering/queueing a document and handing back a stored file. Worth
confirming whether any partial implementation exists (a dompdf/snappy Blade view, a queued
job, a `Storage` disk already picked) so we can check up front that the data the template
needs is all in the payload — the same endpoint's own `opportunities` array currently comes
back empty even though its counters are populated, so a template built on that array would
render a report with no rows.

**Ask.**

1. Is PDF export planned for this round, or deferred? Either answer works for us — we need to
   know whether to keep the button on screen or hide it behind a flag until it lands.
2. **If deferred:** please make it distinguishable without reading prose. Either answer
   `key: "fail"` with `response_status.error: true` (your `msg` is already localized —
   "إنشاء PDF غير متوفر بعد." — and we will surface it verbatim), or add a stable
   machine-readable marker such as `data.status: "not_implemented"`. Anything but a `success`
   envelope that means failure.
3. **If it is being built:** confirm the delivery contract before you build it, because the
   three plausible shapes need different frontend code and only one of them works today:
   - `pdf_url` as an absolute URL we `fetch()` and save as a blob — what the client does now.
     This needs CORS on the file's origin **and** that origin added to our CSP `connect-src`
     (currently self + this API + Google only), so tell us the host it will be served from.
   - `pdf_url` as a short-lived pre-signed link — same as above plus a stated TTL.
   - Streaming the bytes back from this endpoint, the way `/download-certificate/` already
     does. Simplest for us; no CSP or CORS work at all.
4. **The PDF has to contain what the screen contains.** A server-rendered document built
   from `/volunteer-detail/` alone would not match the report the volunteer just looked at —
   that endpoint carries none of the identity fields and an empty `opportunities` array.
   This is everything `/achievement-reports` renders today, and where each piece comes from:

   | Report section | Fields | Where the screen gets them today |
   |---|---|---|
   | Identity block | `profile_pic`, `full_name` (or `first_name` + `last_name`), `email`, `country_code` + `phone_number`, `civil_id` | `GET /account/` |
   | Achievement counters | volunteer hours, volunteer opportunities, certificates | `/volunteer-detail/` counters, `/volunteer-profile/` as fallback |
   | Opportunities & events table | localized title, type (opportunity vs. event), year | `/list-user-opportunities/` (`registered` + `organized`) and `/list-all-opportunities/` (`organized_events` + `sponsored_events`) |
   | Footer | QR code | `/volunteer-profile/qr-code/` |

   Two rendering rules the PDF should match, so a printed report and the screen don't disagree:
   - `profile_pic` is `null` for anyone who never uploaded one. The screen falls back to a
     gender avatar picked from `gender_display.value_en` (`Male` → male, `Female` → female,
     anything else → the neutral one). Please do the same rather than leaving a blank box.
   - A field the account never filled in is **omitted**, not printed as `-`. On a document
     that certifies someone's identity, an empty `الرقم المدني :` label is worse than no row.

5. **Which of those does the PDF pull server-side, and which should reach us in the payload?**
   You have all of it in the database, so rendering it server-side is the straightforward
   path — but if you would rather one request drove both the screen and the document, adding
   the identity fields and a populated `opportunities` array to `/volunteer-detail/` would
   collapse the **eight** requests this screen currently makes into one, and guarantee the
   two can never drift. Either is fine; we need to know which so we stop composing it client-side if
   you take the second.

6. **What language does the PDF render in?** Every other response localizes from the `x-lang`
   / `Accept-Language` header we send, and the account also carries `preferred_language`.
   Say which one drives the document — the header on the download request, or the stored
   preference — because the identity labels, the type column and the counter captions all
   have to come out in one consistent language, and the activity titles exist as separate
   `title_en` / `title_ar` fields that have to be picked to match.

7. To verify: one `GET /volunteer-detail/?download=true` for a volunteer whose report has
   rows, showing the real `pdf_url`, plus confirmation that fetching that URL returns
   `application/pdf` and not an HTML error page.

**Frontend status.** Button left wired and visible, pending answers to asks 1–2. It calls the
endpoint, sees `pdf_url: null`, and shows a generic "No PDF URL found" /
"لم يتم العثور على رابط PDF" toast — which misreports an unbuilt feature as a lookup failure
and throws away the accurate, already-localized `msg` you send. We will switch to surfacing
your `msg` as soon as the response says failure rather than success (ask 2).

The screen itself is finished and is the reference for ask 4: on 2026-09-08 it gained the
identity block (avatar, name, email, phone, civil id — all read from `GET /account/`, which
this screen was already calling) and its activity table now merges the volunteer's
opportunities **and** events. So the on-screen report is complete and only the PDF is
missing — whatever the document ends up rendering should be checked against
`features/achievements/components/AchievementReports.tsx`, not against `/volunteer-detail/`'s
current payload.
## Backend reply — 2026-09-08, frontend done

**Streamed bytes, not a URL.** `GET /volunteer-detail/?download=true` now returns
`Content-Type: application/pdf` with the document as the body — no envelope, no `pdf_url`,
no second request. Built with `mpdf`, matching the screen's design and including the identity
block. The table is built from the *same* `list-user-opportunities` and
`list-all-opportunities` queries the screen runs, called internally as user-scoped
sub-requests, so the PDF cannot drift from `/achievement-reports`. Language comes from
`app()->getLocale()` — i.e. the `x-lang` / `Accept-Language` headers, not
`preferred_language`.

This also settles ask 2 by making it moot: there is no longer a `success` envelope that means
failure, because success is now literally the file.

**Frontend done.** `downloadVolunteerDetail` reads the body as a blob (`responseType: "blob"`)
and the export button saves it directly; the `fetch(pdf_url)` round-trip and the
`VolunteerDetailDownload` / `pdf_url` type are gone. Nothing was needed for the language ask —
the axios request interceptor has always sent `x-lang`, `Accept-Language` and `Lang` on every
request.

One guard added rather than trusting the content type blindly: if the response body isn't a
PDF, it is read as text and the envelope's `msg` is surfaced instead of saving a `.pdf` full
of JSON. That is exactly the shape this item was originally about — a `200` that isn't a
document — and it also catches a Laravel error page.

> **Answered, no action wanted:** the missing gender-fallback avatar and the omitted trophy
> icon are both fine as they are. A volunteer with no `profile_pic` getting no avatar in the
> PDF is a reasonable difference from the screen, and the trophy is decoration — not worth
> shipping an asset for.

---


### BE-20 — Event details returns `event_type_display: null`

| | |
|---|---|
| **Status** | **Answered 2026-09-08 — not a serializer bug.** Guarded going forward; event 19's stored row still needs a look. |
| **Endpoint** | `GET /events/{id}/` — reproduced with `GET /events/19/` |
| **Frontend** | Route `/event-details/{eventId}`; `features/events/components/EventDetails.tsx` |
| **Raised** | 2026-09-08 |

**What we send / What we get.** Opening `/event-details/19` loads:

```http
GET /api/events/19/
```

The request succeeds, but the event-type display value is `null`:

```json
{
  "key": "success",
  "code": 200,
  "data": {
    "id": 19,
    "opportunity_type": "event",
    "title_en": "eslam",
    "title_ar": "اسلام",
    "event_type_display": null
  }
}
```

**Why it's wrong.** The event-details screen renders the localized event type from
`data.event_type_display.value_en` or `value_ar`. Because the API returns `null`, the
**Type** row on `/event-details/19` is blank even though event type is a required field in
the create/edit event form.

This is also a regression from the previous event-detail response contract. It returned
the raw choice id and the populated display object, for example:

```json
{
  "event_type": 64,
  "event_type_display": {
    "id": 64,
    "choice_type": "event_type",
    "value_en": "Entertainment",
    "value_ar": "ترفيه"
  }
}
```

The current response for event 19 also omits the raw `event_type` field entirely. The page
does not need that raw id to render, but its absence may help locate the serializer or data
mapping regression that is also making `event_type_display` null.

**Root-cause hypothesis (Laravel).** The current event-detail resource may not be reading
the event's saved `event_type` choice/relation, or may be passing the wrong/null value to
the choice-display serializer. Another possibility is that event 19's required event-type
selection was not persisted or was lost during data migration. These are hypotheses; the
database value for event 19 will distinguish a data issue from a serializer issue.

**Ask.**

1. Please restore `data.event_type_display` on `GET /events/{id}/` for every event that has
   an event type. Its stable response shape should be:

   ```json
   {
     "id": 64,
     "choice_type": "event_type",
     "value_en": "Entertainment",
     "value_ar": "ترفيه"
   }
   ```

   The values above illustrate the contract; event 19 must return the choice actually saved
   for event 19.
2. Please check the stored event-type choice for event 19. If it is missing despite the form
   requiring it, restore/correct the record and ensure create/update persists `event_type`.
3. Please keep this field consistent between `GET /events/` list items and
   `GET /events/{id}/` details, including both unauthenticated requests and authenticated
   requests using `pass_token=true`.
4. To verify: send the response from `GET /events/19/` showing a non-null
   `data.event_type_display` with `id`, `choice_type`, `value_en`, and `value_ar`.

**Frontend status.** No frontend change is needed. `EventDetails.tsx` already reads the
localized value from `event_type_display`; it will render as soon as the endpoint restores
the existing contract. We intentionally do not infer the type from another field because
the current detail response supplies neither the raw event-type id nor a reliable localized
label.
## Backend reply — 2026-09-08

**Not a serializer bug.** The field is structurally identical to its three sibling `_display`
fields; `event_type_id` was simply optional on both create paths, so event 19 most likely
holds a genuine `NULL`. Now required going forward, so it can't recur. `choice_type` was added
to `event_type_display`.

**Frontend done.** Nothing — `EventDetails.tsx` already reads
`event_type_display.value_en` / `value_ar` and renders correctly as soon as the row has a
value.

> **Open, ours to check:** `SELECT event_type_id FROM events WHERE id = 19;` against the live
> database, and pick a real value if it is `NULL`. Backend can't reach it from their side and
> the correct value can't be inferred from the other fields.

> **Declined for now:** adding `choice_type` to the other three `_display` fields. Nothing
> reads it, so leaving them alone keeps the payload smaller.

> **Reopened as a cause, 2026-09-09 — see [BE-22](#be-22--write-field-names-and-formdata-array-encoding-resolved-in-frontend).**
> "`event_type_id` was optional, so event 19 saved `NULL`" explains how the column could be
> empty, but not why it was: the event form was sending **`event_type`**, not `event_type_id`,
> so the value never reached the column on *any* save. Making the field required stops a save
> with no value — it does not make our payload's value arrive. Expect this to affect far more
> than event 19: please run `SELECT id, event_type_id FROM events ORDER BY id DESC LIMIT 20;`
> rather than only checking 19. If they are all `NULL`, BE-22's rename is confirmed and this
> item's fix is incomplete on its own.

---
