# "Match My Interest" filter returns zero results on every listing endpoint

Status: **RESOLVED by backend, verified.** Real bug, unrelated to the interests-missing-on-opportunities doc: the filter only ever read the legacy `interests` relation, while the current profile UI (`PATCH /volunteer-profile/` with MasterChoice ids) writes a separate `masterInterests` relation — so any user who picked interests through the real UI always hit an empty set and the query was forced to `0 = 1`. Fixed by matching against both relations (translating MasterChoice ids to their `Interest` equivalents by name). `type=146` was never the cause — confirmed unrelated. Also fixed as a bonus: `/learn-serve-opportunities/` previously ignored `match_my_interest` entirely and returned the unfiltered list; it now filters too, so that endpoint's response **will change** for existing callers who pass the flag. No frontend changes required — `match_my_interest` was already sent correctly. Backend flagged one open UX question for us: whether to disable/annotate the toggle when the user has no interests saved at all (since an empty result is still indistinguishable from "filter broken" without checking `GET /volunteer-profile/` → `interest_display` first) — not picked up here, left for a future ask if wanted.

## What the frontend sends

The "Match My Interest" toggle (`AllOpportuniteFilterModal.tsx:443-455`, `AllEventFilterModal.tsx:286-298` — only shown `{user && (...)}`, i.e. logged-in users only) sends a plain boolean, nothing else:

```ts
match_my_interest: filters?.matchMyInterest || undefined,
```

No interest ids are sent alongside it — the frontend has no visibility into which interests the toggle is supposed to match against. It relies entirely on the backend resolving the request to the authenticated user (via the `Authorization` token header) and matching against **that user's own profile interests** server-side.

## What we got back

Both listing endpoints, same filters, `match_my_interest=true`:

```
GET /list-volunteer-opportunities/?page=1&limit=6&search=&location=&gender=&opportunity_nationality=&type=146&match_my_interest=true&status=
GET /learn-serve-opportunities/?page=1&limit=6&search=&location=&gender=&opportunity_nationality=&type=146&match_my_interest=true&status=
```

Both return `"data": [], "meta": { "pagination": { "total": 0 } }` — every single time, across opportunity types.

## Root-cause hypothesis — likely connected to a bug already reported

We just reported (`docs/OPPORTUNITY_INTERESTS_MISSING_ON_DETAILS.md`) that an opportunity's `interests` relation was unexpectedly empty on `/opportunities/{id}/details/` despite the opportunity having a real interest tag assigned. If interest-tag assignments are broadly missing/empty across opportunity records (not just that one), then **"match my interest" would structurally return zero for every user, on every request** — there'd be nothing on the opportunity side to intersect against, regardless of what interests the requesting user has selected on their own profile. That would fully explain a `0`-total result with no error.

The other, more mundane possibility: the specific test user simply has no interests selected on their own profile yet, in which case an empty result here is actually correct, not a bug — we can't tell from the frontend which case this is, since the request carries no interest data of its own to sanity-check against.

## Ask for backend

1. Please confirm whether the test user account (whichever the `Authorization` token in this request belonged to) has any interests saved on their profile at all. If none, this may be working as intended — but please tell us either way, since the frontend can't distinguish "no interests selected" from "filter broken" from the response alone.
2. If the user does have interests selected, please check whether this is downstream of the same issue in `docs/OPPORTUNITY_INTERESTS_MISSING_ON_DETAILS.md` — i.e. re-verify with a user/opportunity pair that you've confirmed genuinely share an interest tag on both sides, and confirm the match logic itself (not just the data) is working.
3. Please also retest with `type=146` removed, to isolate whether that specific type filter is contributing to the zero result independent of `match_my_interest`.
4. Once verified/fixed, please send back a confirmation doc: a request with `match_my_interest=true` for a user known to share an interest with at least one open opportunity, showing that opportunity actually returned.

No frontend changes made — `match_my_interest` is already forwarded as sent by the toggle; there's nothing to adjust on this side until we know whether this is a data issue, a matching-logic issue, or expected behavior for this particular account.
