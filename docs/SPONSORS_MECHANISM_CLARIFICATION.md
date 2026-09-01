# Opportunity sponsors: two mechanisms, need reconciliation before building the new UI

Status: **blocking question for backend, no frontend work done on this yet.**

## What the backend doc says

`FRONTEND_PROFILE_TABS_SPONSORS_AND_FIXES.md` §6 describes attaching a sponsor to an opportunity as **new**:

> "لسه مفيش طريقة لإضافة راعي لفرصة تطوعية/تطويرية قبل كده (كان موجود بس للفعاليات، ودّا كان فيه مشكلة)" — *"There was previously no way to add a sponsor to a volunteer/development opportunity (it only existed for events, and had an issue)."*

Proposed as a **separate REST resource**:
```
POST   /api/volunteer-opportunities/{id}/sponsors/    { "organization_id": 12 }
DELETE /api/volunteer-opportunities/{id}/sponsors/{sponsorId}/
POST   /api/learn-serve-opportunities/{id}/sponsors/   { "organization_id": 12 }
DELETE /api/learn-serve-opportunities/{id}/sponsors/{sponsorId}/
```

## What's actually already in fursa-next

`src/features/opportunities/components/LearnServeForm.tsx` already has a fully working sponsor picker — `FieldArray name="sponsors"` (line ~1769), backed by an organization search/pick UI, pre-populated from `opportunityData?.opportunity_sponsor_images` on edit (line ~752). It submits sponsors **inline, as part of the same multipart create/update request** for the opportunity itself:

```
opportunity_sponsor_images_organization_{n}: <organization id>
opportunity_sponsor_images_position_{n}: <position>
```

This reads and writes the exact same data the doc's new endpoints target (`opportunity_sponsor_images`), just through a different mechanism — one big form submission instead of separate add/remove calls. This picker is live in the create/edit flow for learn-and-serve opportunities today (not verified for volunteer opportunities' `VolunteerForm.tsx` — worth checking there too).

## Why this needs reconciling before any new UI gets built

Two ways to write the same `opportunity_sponsor_images` relationship risk fighting each other — e.g., the existing inline picker could silently overwrite whatever the new add/remove endpoints changed, or vice versa, depending on how the backend handles a full-object PUT/PATCH that includes (or omits) the sponsors array alongside the new dedicated endpoints.

## Ask for backend

Before any new sponsor-management UI is built on the frontend, please confirm:
1. Is the existing inline `opportunity_sponsor_images_organization_{n}` mechanism being replaced by the new `/sponsors/` endpoints, or are both meant to coexist?
2. If replaced: does submitting an opportunity update *without* the `opportunity_sponsor_images_organization_{n}` fields now leave existing sponsors untouched (rather than clearing them), so the frontend can safely stop sending them once it switches to the new endpoints?
3. Was the "issue" mentioned in the doc (previously only worked for events) about this inline mechanism specifically, or about something else?

No frontend changes made pending this — `LearnServeForm.tsx`'s existing sponsor picker is untouched.
