# `POST /scan-permissions/bulk-update/` — request contract clarification needed

Status: **✅ RESOLVED by backend — 2 September 2026.** The endpoint now accepts the frontend's existing `user_ids` + `is_allowed` payload as-is (normalised server-side into the canonical `permissions[]`), so **no payload change was needed**. Full backend reply: [`SCAN_PERMISSIONS_BULK_UPDATE_BACKEND_RESPONSE.md`](./SCAN_PERMISSIONS_BULK_UPDATE_BACKEND_RESPONSE.md) (same folder). The error-surfacing shipped while waiting already covers every documented failure shape (422 validation errors, 400 missing-scope via the `msg` fallback, 403 non-owner).

## Endpoint & consumers

```
POST https://portal.fursa.raiyan.cc/api/scan-permissions/bulk-update/
```

Two flows on `/scan-permission` (`fursa-next/src/features/opportunities/components/ScanPermission.tsx`) hit it through `bulkUpdateScanPermissions()` (`src/features/opportunities/services/attendance.ts` → `lib/api/client.ts`, which sends `Authorization`, `x-lang`, `Accept-Language` and `Lang` headers):

1. **Grant** — the "Add Permission" modal: organizer selects one or more volunteers and bulk-allows them to scan attendance.
2. **Revoke** — the trash icon on a permissions row (after a confirm step): bulk-denies scanning for a single volunteer.

## What the frontend currently sends

Grant (`is_allowed: true`, from the Add Permission modal — captured 2026-09-02, opportunity 113, volunteers 5 and 6):

```json
{
    "opportunity_id": 113,
    "user_ids": [5, 6],
    "is_allowed": true
}
```

Revoke: identical shape with `"is_allowed": false` and a single id in `user_ids`.

When the permission page is opened from an **event** (not an opportunity), the frontend sends `event_id` instead of `opportunity_id`. Please confirm that variant is accepted too.

## Observed response (grant call above)

```json
{
    "key": "fail",
    "msg": "خطأ في التحقق من البيانات",
    "code": 422,
    "response_status": {
        "error": true,
        "validation_errors": {
            "permissions": [
                "حقل الصلاحيات مطلوب."
            ]
        }
    },
    "data": null
}
```

Decoded: `msg` = *"خطأ في التحقق من البيانات"* ("Data validation error"); the field error under `response_status.validation_errors.permissions` = *"حقل الصلاحيات مطلوب."* ("The permissions field is required.")

So the backend expects a `permissions` field the frontend was never told about. Everything else (`opportunity_id`, `user_ids`, `is_allowed`) is seemingly ignored or no longer sufficient on its own — that's what we need spelled out.

## Ask for backend — the keys you use and their accepted values

Please fill in this table (directly on this doc or in chat) so the frontend can match the contract exactly:

| # | Field | Type | Required? | Accepted values / shape | Notes |
|---|-------|------|-----------|--------------------------|-------|
| 1 | `permissions` | ? | ? (the 422 says required) | ? | Exact shape please — e.g. `[{ "user_id": 5, "is_allowed": true }]`? array of ids? map? |
| 2 | `opportunity_id` | ? | ? | ? | integer/string? still accepted? mutually exclusive with `event_id`? |
| 3 | `event_id` | ? | ? | ? | supported for event-scoped permissions? |
| 4 | `user_ids` | ? | ? | ? | still accepted (e.g. alongside a single shared `is_allowed`), or fully replaced by `permissions`? |
| 5 | `is_allowed` | ? | ? | ? | still the grant/revoke flag, or is grant/revoke now encoded per-entry inside `permissions`? |

Specifically confirm:

1. **The exact `permissions` shape** — that is the only error we can see today ("field required"); we don't want to guess between `[{user_id, is_allowed}]`, `{user_id: is_allowed}` maps, or something else.
2. **How grant vs revoke is expressed** — one flag, per-entry values, or separate endpoints.
3. **Whether one call can mix grants and revokes** (per-entry `is_allowed`), or one call is all-or-nothing.
4. **The success response** — we assume the standard envelope `{ key: "success", msg, code, response_status, data }`; please confirm and say what `data` carries (if anything — created/updated permission rows? counts?).
5. **Localized messages** — keep validation messages arriving under `response_status.validation_errors` (already localized from the `x-lang` / `Accept-Language` header). The frontend toasts print them verbatim.
6. **One working example request body for each flow** — bulk grant (several volunteers) and single revoke.

## Frontend side — already done while we wait

- Both callers of this endpoint (Add Permission modal and Remove Permission confirm) now check the **response envelope**, not just the HTTP status: a resolved HTTP 200 with `key: "fail"` / `response_status.error` is treated as a failure (`isApiSuccess()` from `lib/api/errors.ts`).
- Failures surface the API's **localized validation messages** as error toasts (`getApiErrorMessages()` — reads `response_status.validation_errors`, falls back to `msg`), with the translated generics `COMMON.PERMISSION_ADDED_FAILED` / `COMMON.SCAN_PERMISSION_FAILED` only when the API says nothing usable. The modal stays open so the organizer can retry.
- Previously the handlers looked for `message_en` / `message_ar`, keys this endpoint never sends — the specific validation reason (like the `permissions` error above) never reached the user, only the generic fallback did.
- **Payload unchanged — and staying that way.** The backend now normalises `user_ids` + `is_allowed` into `permissions[]` server-side; the flat shape the frontend always sent is officially supported (confirmed 2026-09-02 — see [`SCAN_PERMISSIONS_BULK_UPDATE_BACKEND_RESPONSE.md`](./SCAN_PERMISSIONS_BULK_UPDATE_BACKEND_RESPONSE.md)).
