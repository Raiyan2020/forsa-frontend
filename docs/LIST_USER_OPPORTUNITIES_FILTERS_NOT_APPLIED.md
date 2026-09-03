# `list-user-opportunities` filters (tags confirmed, others suspected) aren't applied server-side

Status: **Open — backend bug, blocking. Please retest every filter key/value on this endpoint and reply with a new confirmation doc.**

## What the frontend calls

`/public-profile/{id}`'s opportunities tab (`src/features/profile/components/CommonProfile.tsx`) applies the profile's filter modal on top of the listing request:

```
GET /list-user-opportunities/?filter_type=registered&user_id=65&tags%5B%5D=rrr&page=1&limit=30
```
(`tags[]=rrr` after selecting the tag "rrr" in the filter modal.)

The frontend request itself is well-formed: `tags` is sent as a repeated `tags[]=<value>` array param, the same convention this app already uses successfully for other array filters elsewhere (e.g. `teams[]=`/`roles[]=` on the volunteer registrations list). `filter_type=registered&user_id=65` alone (i.e. this same request with the `tags` param removed) is already confirmed working — see the previous handoff on this endpoint.

## What we expected vs. got

Expected: a subset of user 65's opportunities that carry the tag "rrr".

Actual: identical response to the same request **without** the `tags` filter at all — the tag filter has no visible effect on the result set.

## Root-cause hypothesis

No visibility into the backend implementation from here, so no strong hypothesis — only that `tags` is accepted (200 OK, no validation error) but silently has no effect on the query. Given that, we'd also like the other `list-user-opportunities` filter keys re-verified rather than assumed working, since an endpoint that silently no-ops one filter param is exactly the kind of bug that could affect others (`opportunity_type`, `opportunity_status`, `start_date`, `end_date`, `search`) without it being obvious from the response shape.

Since this API is a Laravel app, a few common causes worth checking first (no code visibility here, just pointers):
- `$request->validate()`/`->validated()` in the controller not listing `tags` in its rules — anything not declared there silently disappears even though `all()`/`input()` would still see it, which would explain a `200` with no error and no effect.
- If tags are a many-to-many relation, the filter needing a `whereHas('tags', fn ($q) => $q->whereIn(...))` (or `whereIn` on a pivot/junction table) rather than a plain `where('tags', ...)` on the opportunities table itself.
- `tags[]=rrr` arriving as `$request->tags` — confirm it's actually read as an array (`$request->query('tags')` / `$request->array('tags')`) rather than expected as a comma-separated string or a differently-named key.

## Impact

Any tag filter applied on a profile's opportunities/events tab (own or public) returns the full unfiltered list instead of the expected subset — filtering silently does nothing, with no error to signal it.

## Ask for backend

1. Please retest `list-user-opportunities` with **every filter key** it accepts (`tags`, `opportunity_type`, `opportunity_status`, `start_date`, `end_date`, `search`, and any others in its parameter list) and a range of values for each — confirm each one actually narrows the result set, not just that the request returns `200`.
2. For `tags` specifically: please confirm the expected param format (`tags[]=value` repeated, vs. a comma-joined single value, vs. something else) in case the two sides disagree on shape rather than the filter being unimplemented.
3. Once verified/fixed, please send back a new confirmation doc: for each filter key, one example request + a before/after pair of responses showing the result set actually changing.

No frontend changes made — the request already matches this app's established array-filter convention and the unfiltered request on the same endpoint is confirmed working, so there's nothing to adjust on this side until backend confirms which filters are actually applied.
