# `sort_by=newest` on `list-volunteer-opportunities` doesn't return newest-first

Status: **Open — backend bug, blocking. Please retest `sort_by=newest`/`oldest` and reply with a new confirmation doc.**

## What the frontend sends

The "Sort" option in the opportunities list filter modal (`AllOpportuniteFilterModal.tsx:339-340`) sends the literal values `newest` / `oldest`:

```
GET /list-volunteer-opportunities/?page=1&limit=9&search=&location=&gender=&opportunity_nationality=&type=&status=&sort_by=newest
```

## What we compared

Same request, same filters, captured back to back — only difference is the added `sort_by=newest`.

**Without `sort_by`** (page 1, ids in returned order):
```
126, 125, 127, 97, 98, 12, 13, 15, 18
```

**With `sort_by=newest`** (page 1, ids in returned order):
```
97, 98, 127, 126, 125, 92, 94, 95, 104
```

Opportunities `125`, `126`, `127` were all created within minutes of each other today (`2026-09-03`, per their matching `due_date` timestamps `2026-09-03T08:0X:XX`/`08:55:22`) — they are the **newest** records in the whole dataset by id and by creation time. Opportunities `97` and `98` are older (`due_date` back on `2026-09-02`/earlier, lower ids).

Under `sort_by=newest`, the genuinely newest records (`125`–`127`) rank **behind** the older ones (`97`, `98`) — the opposite of what "newest first" should do. The tail of that same response then mixes in opportunities `92`, `94`, `95` — UK-based records with `due_date` back in **August**, i.e. clearly older still — ahead of `104` (`due_date` `2026-09-02`). Whatever `sort_by=newest` is ordering by, it isn't creation time, id, `due_date`, or `start_date` in either direction — none of those produce this sequence.

## Root-cause hypothesis

No visibility into the backend implementation from here. Two possibilities worth checking on the Laravel side:
- The `sort_by` query param isn't wired into an `orderBy()` on this endpoint's query builder at all, and what we're seeing is just non-deterministic ordering (e.g. no explicit `orderBy`, so it falls back to whatever the DB/pagination cursor returns) rather than an actual sort.
- It's ordering by the wrong column (e.g. `updated_at` instead of `created_at`, or a column that gets touched by an unrelated update — approval, edit, a registration count changing — making "newest" really mean "most recently modified for any reason").

## Impact

Volunteers sorting by "Newest" (a very ordinary, likely frequently used action) get a list that isn't actually ordered by recency — new opportunities can be buried past page 1 while older, less relevant ones surface first.

## Ask for backend

1. Please confirm what column `sort_by=newest`/`oldest` is intended to order by (ideally `created_at`), and retest that it actually produces a strictly newest-first / oldest-first sequence across a full result set, not just page 1.
2. Please also confirm the **unsorted** (no `sort_by` param) default ordering is intentional — it currently looks grouped by status relevance (in-progress, then upcoming, then completed) rather than any date field, which is fine, but we'd like it confirmed as deliberate rather than incidental.
3. Once fixed, please send back a confirmation doc: one example request with `sort_by=newest` and the resulting id/`created_at` sequence showing it's actually descending.

No frontend changes made — `sortBy` is already sent as the literal `newest`/`oldest` values per the filter modal; nothing to adjust on this side until backend confirms the sort is applied correctly.
