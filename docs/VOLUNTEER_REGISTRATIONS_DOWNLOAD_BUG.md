# Volunteer registrations "Download Sheet" button does nothing — endpoint doesn't return a file link

Status: **RESOLVED.** Backend confirmed the payload is nested under the standard `data` envelope field (`docs/FRONTEND_VOLUNTEER_REGISTRATIONS_DOWNLOAD_FIX.md`), unlike its sibling download endpoints which return `downloadUrl` at the envelope's top level. Fixed in `downloadVolunteerRegistrations()` (`src/features/opportunities/services/registrations.ts`), which now unwraps `r.data.data`. `VolunteerList.tsx`'s `handleDownload()` also now shows an error toast if a request succeeds without a `downloadUrl`, and surfaces `attendance_marked_count` in a second toast when `mark_attendance` was requested.

## What the frontend calls

`src/features/opportunities/components/VolunteerList.tsx` → `handleDownload()` → `downloadVolunteerRegistrations()` (`src/features/opportunities/services/registrations.ts:59`):

```
GET /api/volunteer-opportunity-registrations/?opportunity_id=113&download=true&mark_attendance=true&date=2026-08-29
```

## What the frontend expects back

```ts
export interface RegistrationsDownload {
  downloadUrl: string;
}
```

`handleDownload()` reads `response.downloadUrl`, creates an `<a>` with it, and clicks it to trigger the browser download:

```ts
const response = await downloadMutation.mutateAsync({ ... });
if (response.downloadUrl) {
  const link = document.createElement("a");
  link.href = response.downloadUrl;
  link.download = "List of Registered Volunteers.xlsx";
  ...
}
```

This is an **established, working pattern elsewhere in the same app** — the identical `?download=true` convention returns `{ downloadUrl }` correctly for:
- `RegisterList.tsx` / `RegisterListForLearnandServe.tsx` (learn-and-serve registrations)
- `EventRegisterList.tsx` (event registrations)
- `ScanPermission.tsx` / `attendance.ts` (attendance sheet)

`services/opportunities.ts` even has a comment documenting the contract:
> "Unlike the registration 'download' endpoints (which return a JSON `downloadUrl`), this one returns the bytes..."

## What we actually got back

Instead of `{ downloadUrl: "..." }`, the volunteer-opportunity-registrations endpoint returns the same JSON list shape as a normal (non-download) request — no file, no link, nothing to download:

```json
{
    "key": "success",
    "msg": "تم استرجاع التسجيلات بنجاح.",
    "code": 200,
    "response_status": { "error": false, "validation_errors": [] },
    "data": [
        {
            "id": 993,
            "opportunity": 113,
            "user": 5,
            "registration_date": "2026-09-02T09:31:41+00:00",
            "status": "approved",
            "full_name": "hind aljasser",
            "user_email": "hindaljasser@gmail.com",
            "team": null,
            "role": null,
            "user_contact_number": "+96555444285",
            "qr_code_url": "https://portal.fursa.raiyan.cc/storage/volunteer_qr_codes/2dfcff95-09ff-407e-a8c5-1a0e1fd6cb60/2dfcff95-09ff-407e-a8c5-1a0e1fd6cb60.png",
            "volunteer_uuid": "2dfcff95-09ff-407e-a8c5-1a0e1fd6cb60",
            "is_attended": false,
            "date_wise_attended": [],
            "created_at": "2026-09-02T09:31:41+00:00",
            "phone_number": "55444285",
            "civil_id": "286112201719",
            "passport_number": null
        }
    ],
    "meta": {
        "pagination": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 },
        "timestamp": "2026-09-02T10:08:42+00:00"
    }
}
```

Effect on the app: the request succeeds (200, `key: "success"`), so the button shows a success toast — but since `response.downloadUrl` is `undefined`, the `if` branch never runs and no file is ever downloaded. The click silently does nothing from the user's point of view, while telling them it worked.

There's a second open question inside the same request: `mark_attendance=true&date=2026-08-29` is sent alongside `download=true` (this screen's "Download Sheet" button is also expected to bulk-mark attendance for the selected date when manual tracking is on — see `manual_tracking ? true : undefined` in `handleDownload`). The response gives no indication either way whether that side effect actually ran, since `is_attended`/`date_wise_attended` on the one returned row are both empty/false.

## Ask for backend

1. Should `GET /volunteer-opportunity-registrations/?...&download=true` return `{ "downloadUrl": "..." }` the same way the equivalent learn-and-serve / event registration endpoints already do? If so, please add that.
2. If a different, already-correct endpoint exists for downloading a volunteer opportunity's registration sheet, tell us its path/params so we can point the frontend at it instead.
3. If neither exists yet, please confirm so we know this needs to be built from scratch, and let us know the target file format (the frontend currently just guesses `.xlsx` for the saved filename).
4. Please confirm whether `mark_attendance` + `date` on this same request are actually applied server-side when `download=true` is also present — the sample response above doesn't show attendance having been marked for the one row it returned.

No frontend changes made pending this — the button still fires the same request/handling as before.
