# Re-registering for a volunteer opportunity after unregistering throws a 500

Status: **RESOLVED by backend, verified.** `store()` now revives the cancelled row instead of inserting a fresh one (same `registration.id` on re-registration), reuses the existing assignment row, and catches the residual race-condition duplicate as a normal `422` instead of a raw `500`. Confirmed frontend needs no changes: `registerForVolunteerOpportunity`/`unregisterFromVolunteerOpportunity` already send the right payload/endpoint, and both registration-flow consumers (`ConfirmVolunteerRegistrationModal.tsx`, `VolunteerRegisterRoleModal.tsx`) already handle `400`/`422` identically via `getApiErrorMessage()` — no status-code branching to update.

## Repro (as a logged-in volunteer)

1. On `/volunteer-event-detail/97`, register for the opportunity:
   ```
   POST /api/volunteer-opportunity-registrations/
   { "opportunity_id": "97", "role_id": "30" }
   ```
   Succeeds, app redirects to `/register-now`.

2. Cancel the registration:
   ```
   DELETE /api/volunteer-opportunities/97/unregister/
   ```
   Returns `200`, `key: "success"`:
   ```json
   {
       "key": "success",
       "msg": "تم إلغاء التسجيل من الفرصة بنجاح.",
       "code": 200,
       "response_status": { "error": false, "validation_errors": [] },
       "data": null
   }
   ```

3. Register again, **same payload as step 1**:
   ```
   POST /api/volunteer-opportunity-registrations/
   { "opportunity_id": "97", "role_id": "30" }
   ```
   Returns **`500 Internal Server Error`** — a raw Laravel exception, not the normal API error envelope:
   ```json
   {
       "message": "SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry '97-690' for key 'volunteer_opportunity_registrations.vol_opp_reg_unique' (Connection: mysql, SQL: insert into `volunteer_opportunity_registrations` (`opportunity_id`, `user_id`, `registration_date`, `status`, `updated_at`, `created_at`) values (97, 690, 2026-09-02 12:07:03, pending, 2026-09-02 12:07:03, 2026-09-02 12:07:03))",
       "exception": "Illuminate\\Database\\UniqueConstraintViolationException",
       "file": ".../vendor/laravel/framework/src/Illuminate/Database/Connection.php",
       "line": 824
   }
   ```
   (Full stack trace available if needed — trimmed here, it's routine Laravel middleware/pipeline framing down to `VolunteerOpportunityRegistrationController::store()` line 274.)

## What this looks like from the backend code

`VolunteerOpportunityRegistrationController::store()` (line ~274) does an unconditional `Model::create([...])` on `volunteer_opportunity_registrations`. The table has a unique constraint `vol_opp_reg_unique` on `(opportunity_id, user_id)`. Step 2's `unregister` call reports success but apparently doesn't remove (or fully release) the row it's supposed to cancel — most likely it's a soft delete (sets a `status`/`deleted_at` column) rather than a hard delete, and the unique index isn't scoped to exclude cancelled/soft-deleted rows. So the second `POST` in step 3 collides with the row that `unregister` was supposed to have retired.

## Impact

Any volunteer who registers, then unregisters, then tries to register again for the **same opportunity** gets a hard 500 with a raw stack trace instead of either succeeding or a normal validation error. This is a very reachable path (register → change your mind → re-register is an ordinary flow), not an edge case.

## Ask for backend

1. Please fix `unregister` and/or `store()` so re-registering after a cancellation works — either have `unregister` hard-delete the row, or have `store()` detect and reactivate/update an existing cancelled row for that `(opportunity_id, user_id)` pair instead of blindly inserting.
2. Regardless of the fix above, a `1062` duplicate-key collision reaching the client as a raw `500` with a Laravel stack trace is itself worth guarding against (e.g. catching `QueryException` / `UniqueConstraintViolationException` in `store()` and returning the normal `422` validation-error envelope) so a future case like this fails safely instead of leaking an exception trace.
3. Once fixed, please send back a short confirmation doc (repro steps re-tested, and the exact response shape on both a fresh registration and a re-registration after cancelling) so the frontend can verify against it.

No frontend changes made — `registerForVolunteerOpportunity` / `unregisterFromVolunteerOpportunity` (`src/features/opportunities/services/registrations.ts:6-10`) already send exactly this payload/endpoint pair; there's nothing to change on this side until the backend behavior is fixed.
