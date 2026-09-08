# Fursa — backend issues & clarifications (single log)

One file for everything the frontend needs from the backend team: bugs, contract questions,
and the answers we've already received. It replaces the per-issue `*_BUG.md` /
`*_CLARIFICATION.md` / `*_HANDOFF.md` docs that used to live in this folder.

**API:** `https://portal.fursa.raiyan.cc/api/` · **Backend:** Laravel ("portal", separate repo) · **Frontend:** `fursa-next` (Next.js 16)

> **Reset 2026-09-08 — this log is empty on purpose.** Round 1 (BE-01 … BE-18) is archived
> whole in [`BACKEND_ISSUES_ROUND_1.md`](./BACKEND_ISSUES_ROUND_1.md), including **three items
> that were still open** when it was archived: BE-01 (interest tags empty platform-wide),
> BE-17 (learn-serve choice fields `null`) and BE-18 (`filter_type=myevents` returns the whole
> event catalogue). Archiving did not resolve them — if any still matters, copy it back here
> under its **existing** id.
>
> **The next new item is BE-19.** Ids are never reused or renumbered, so read the archive's
> header before picking one.

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
| _(empty — first item of round 2 takes BE-19)_ | | | |

---

# Open

_Nothing raised yet this round._

---

# Answered / Resolved

_Nothing yet this round. Items move here from **Open** as they are answered; reopen one by
moving it back up with a dated note. Round 1's answered items are in
[`BACKEND_ISSUES_ROUND_1.md`](./BACKEND_ISSUES_ROUND_1.md)._
