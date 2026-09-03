# `name` filter on `/posts/` (community) has no effect

Status: **Open — backend bug, blocking. Please retest and reply with a new confirmation doc using correct key/value examples.**

## What the frontend sends

`/community`'s filter modal (`CommunityFilterModal.tsx:92-99`) has a plain text field labeled "Enter name" (`COMMON.ENTER.NAME`), forwarded verbatim as `name` (`Community.tsx:92`):

```
GET /posts/?page=1&limit=10&search=&name=isl&type=
```

## What we compared

Same request, same pagination, only difference is `name=isl` vs. no `name` at all — captured minutes apart:

**Without `name`:** 11 posts total, ids `15, 14, 13, 12, 11, 10, 9, 4, 3, 2` (page 1 of 2).
**With `name=isl`:** **identical** 11 posts, same ids, same order, same `total: 11`.

Only one post in the whole dataset plausibly matches "isl" — id `15`, whose author is `"full_name": "islam"`, `"nickname": "islamGH"`. The filtered response should have returned just that one (or however many posts that author has), not the full unfiltered set.

## Root-cause hypothesis (Laravel)

Same shape as the `tags` filter bug already reported on `list-user-opportunities` (`docs/LIST_USER_OPPORTUNITIES_FILTERS_NOT_APPLIED.md`) — the param is accepted with `200 OK` and no validation error, but appears to have no effect on the query at all. Worth checking:
- `$request->validate()`/`->validated()` on the posts index controller not listing `name` in its rules, so it's silently dropped even though `all()`/`input()` would still see it.
- If `name` is meant to match the post author's `nickname` and/or `full_name` (both plausible, given `nickname` is a top-level field on each post and `full_name` lives on the nested `user` object), confirm which one(s) it's supposed to search, and whether it needs a join/`whereHas('user', ...)` rather than a plain `where('name', ...)` on the posts table itself (which has no `name` column).

## Ask for backend

1. Please confirm what `name` is intended to filter on — the post's own `nickname`, the author's `full_name`, or both — and wire it into the query.
2. Please retest with a value that should match exactly one post (e.g. `name=isl` against the dataset above) and confirm the response narrows accordingly.
3. While you're in this endpoint, please also verify `search` (currently untested by us — left empty in both requests above) and `type` behave correctly, since we'd rather catch any sibling issue now than file a second doc later.
4. Once fixed, please send back a confirmation doc with a concrete example: the exact request URL, and the before/after response bodies (or at minimum the before/after id lists) showing `name` actually narrowing the result set — same format as this doc, so we can verify directly.

No frontend changes made — `name` is already forwarded exactly as typed into the filter field; there's nothing to adjust on this side until the backend query actually applies it.
