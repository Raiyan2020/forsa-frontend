# `opportunity_status` is always "upcoming" on `list-all-opportunities`, even for ended/started opportunities

Status: **Open — backend bug, blocking.** No frontend fix possible until the endpoint returns a correct value.

## What the frontend calls

`GET /list-all-opportunities/` — used by (at least):
- `/entities-profile` and `/public-profile/{id}` (organization's "organized opportunities" tab): `?search=&page=1&limit=9&filter_type=organized&opportunity_type=&status=` (own profile) and `?filter_type=organized&user_id={id}&page=1&limit=30` (another user's public profile).

The card badge (`src/features/profile/components/ProfileVolunteerCard.tsx:546-560`) reads `item.opportunity_status` directly and labels it:
```ts
item.opportunity_status === "inprogress"
  ? t("COMMON.IN_PROGRESS")
  : item.opportunity_status === "completed"
    ? t("COMMON.FINISHED")
    : t("COMMON.UPCOMING")   // anything else, including "upcoming", falls here
```

## What we actually got back

Two real responses, captured the same minute (`timestamp` ~`2026-09-03T09:0X`), today being `2026-09-03`:

```
GET /list-all-opportunities/?search=&page=1&limit=9&filter_type=organized&opportunity_type=&status=
```
| id | start_date | end_date | opportunity_status | action_state | has_started | has_ended |
|---|---|---|---|---|---|---|
| 113 | 2026-08-29 | 2026-08-31 | **upcoming** | ended | false | true |
| 115 | 2026-09-02 | 2026-09-17 | **upcoming** | started | true | false |
| 118 | 2026-08-31 | 2026-08-31 | **upcoming** | ended | false | true |
| 121 | 2026-09-01 | 2026-09-04 | **upcoming** | started | true | false |
| 122 | 2026-09-02 | 2026-09-17 | **upcoming** | started | true | false |
| 124 | 2026-09-02 | 2026-09-03 | **upcoming** | started | true | false |
| 125 | 2026-09-03 | 2026-09-04 | **upcoming** | started | true | false |

```
GET /list-all-opportunities/?filter_type=organized&user_id=975&page=1&limit=30
```
| id | start_date | end_date | opportunity_status | action_state | has_started | has_ended |
|---|---|---|---|---|---|---|
| 114 | 2026-08-28 | 2026-08-31 | **upcoming** | ended | false | true |
| 116 | 2026-09-01 | 2026-09-03 | **upcoming** | started | true | false |
| 117 | 2026-08-30 | 2026-08-30 | **upcoming** | ended | false | true |
| 119 | 2026-08-30 | 2026-08-30 | **upcoming** | ended | false | true |

**Every single item in both responses reports `opportunity_status: "upcoming"`**, regardless of whether its own `action_state`/`has_started`/`has_ended` say it already ended days ago (e.g. #113 ended 3 days before this request) or is currently in progress (e.g. #125, which started today). `action_state`, `has_started` and `has_ended` are clearly being recomputed per item against the current date — `opportunity_status` is not.

## Effect on the app

Any opportunity's card on the organizer's own profile or a public profile shows a "قادمة" (Upcoming) badge no matter its real state — including opportunities that finished days ago, as in the attached screenshots (`/entities-profile` and `/public-profile/975`, opportunity #113/#114, already `has_ended: true`).

## Root-cause hypothesis

`list-all-opportunities` most likely serializes `opportunity_status` from a stored/cached column (or one only updated by a scheduled job / on write) instead of deriving it live the same way `action_state` clearly is. Other endpoints in this app (e.g. `/opportunities/{id}/details/`) return an `opportunity_status` that does vary correctly by item, so this looks specific to this list endpoint's serializer, or to whatever recomputes the stored value not running for these records.

## Ask for backend

1. Please make `opportunity_status` on `list-all-opportunities` reflect the opportunity's real current state (upcoming / started / ended), consistent with `action_state`, `has_started`, and `has_ended` on the same payload — the same way it already works on `/opportunities/{id}/details/`.
2. If `opportunity_status` and `action_state` are intentionally two different concepts (e.g. one is admin-set, one is date-derived), please clarify the distinction and which one the frontend should be using for this status badge — right now they disagree on effectively every record.
3. Once fixed, please send back a short confirmation doc (a re-tested `list-all-opportunities` response showing `opportunity_status` varying correctly per item) so the frontend can verify.

No frontend changes made — the badge already reads the field the backend documents as the opportunity's status (`opportunity_status`); switching it to read `action_state` instead without backend confirmation would just swap one field for another without knowing which one is meant to be authoritative here.
