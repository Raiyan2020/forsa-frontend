# Backend issues — remaining work after the 2026-09-09 review

This file was reconciled against:

- backend commit `485e511` (`feat: Implement API route protection for admin actions`);
- its parent `fc93c86` (MasterChoice interests and strict write-key validation);
- `fursa_backend/docs/BACKEND_REPLY_2026-09-09.md` from backend `HEAD`.

The code implementation was checked directly. The backend reply is supporting evidence, not
the source of truth. Solved issue details were removed from this file; their permanent IDs are
kept in the resolved summary below.

> **Important:** the code has not been deployed or checked against production from this
> workspace. The production operations and data repairs listed under **Open** are therefore
> still required.

## Status summary

### Open / partially resolved

| ID | Remaining work | Owner |
|---|---|---|
| [BE-01](#be-01--production-interest-backfill-and-verification) | Run/verify the legacy-interest backfill on production and verify opportunity 97 | Backend / deployment |
| [BE-14](#be-14--production-certificate-backfill-and-registration-996) | Run the missing-certificate backfill and verify registration 996 | Backend / deployment |
| [BE-17](#be-17--repair-legacy-learn--serve-choice-values) | Repair existing Learn & Serve rows whose required choice IDs are still null | Backend / data owner |
| [BE-20](#be-20--audit-and-repair-legacy-event-type-values) | Audit and repair historical events with `event_type_id = NULL`, including event 19 | Backend / data owner |
| [BE-34](#be-34--achievement-report-pdf-500s-in-production-mpdf-not-installed) | Install the `mpdf/mpdf` dependency on production so the achievement report export stops returning `500` | Backend / deployment |

### Resolved in backend code

| ID | Verified implementation |
|---|---|
| **BE-14 (code)** | Updating attendance hours regenerates an issued volunteer certificate without sending a second notification. |
| **BE-18** | `filter_type=myevents` is implemented, and unknown `filter_type` values return `422`. |
| **BE-19** | Achievement report export returns a real PDF **in code**; it still fails in production — see BE-34. |
| **BE-20 (future writes)** | `event_type_id` is required for new events and returned display data includes the choice type. |
| **BE-21** | `/user-certificates/` returns `registration_type: volunteer\|learn_serve`. |
| **BE-22** | Canonical `*_id` fields and bracketed multipart arrays are accepted; unknown write keys are rejected. |
| **BE-23** | Context-scoped MasterChoice interest IDs are accepted atomically and mirrored to legacy interests by name rather than numeric-ID collision. |
| **BE-24** | All five authenticated calendar routes are registered. |
| **BE-25** | Event, volunteer, and Learn & Serve republish contracts are implemented with ownership and media-copy rules. |
| **BE-26** | Event, Learn & Serve, and scan-permission exports return XLSX downloads with owner checks. |
| **BE-27** | Registration creation now enforces approval, visibility, lifecycle, registration-window, and capacity rules. |
| **BE-28** | Event-registration access, event time-slot scoping, and scan-permission ownership are enforced. |
| **BE-29** | Contact administration and sponsor mutations require authenticated staff; public submissions are throttled. |
| **BE-30** | Event, post, and reply updates implement validated `existing_image_ids` keep-set semantics. |
| **BE-31** | Sponsor relations can be restored after soft deletion; event sponsor add/remove routes and organization data are present. |
| **BE-32** | Event participation choices now derive and validate registration/payment behavior. |
| **BE-33** | Community `search` matches post text/title or author name/nickname; `name` remains an author-only filter. |

## Verification required before release

The backend reply does not include a final numeric result for the complete test suite. This
workspace also has no PHP runtime, Composer executable, or installed `vendor/`, so the suite
could not be rerun here. The committed `.phpunit.result.cache` is not release evidence and
still contains historical defect entries.

Before deployment, please run and return the exact summary from:

```bash
php artisan test --compact
```

If any test fails, include the failing test name and output. After deployment, rebuild the
Laravel configuration and route caches using the project's normal production procedure, then
perform the four production checks below.

---

# Open

## BE-01 — Production interest backfill and verification

| | |
|---|---|
| **Status** | Partially resolved — read/write code is fixed; production verification remains |
| **Affected data** | Historical opportunity and event interest assignments |
| **Primary example** | Volunteer opportunity 97; historical picker IDs 71, 74, and 80 |

### What is solved

- Opportunity and event writes accept the context-specific IDs returned by `/choices/.../`.
- Mixed valid/invalid IDs fail atomically with `422`.
- MasterChoice IDs are stored on the master pivot.
- Legacy `Interest` rows are resolved or created by name, rather than by coincidental numeric
  equality between two unrelated tables.
- Read resources prefer the master-choice pivot and return populated `interests` and
  `interest_display` values when those relations exist.

### What remains

The backend reply explicitly says the production command was not run and opportunity 97 was
not verified. Historical rows may therefore still need the existing idempotent backfill.

### Required backend action and proof

1. Deploy the latest backend code.
2. Run:

   ```bash
   php artisan fursa:backfill-legacy-opportunity-interest-tags
   ```

3. Return the command's inserted/created/skipped counts.
4. Return the production response from:

   ```http
   GET /api/opportunities/97/details/
   ```

5. Confirm that its historical tags are present in `interests` and/or `interest_display`.

Do not close BE-01 using fixture-test output alone; the remaining requirement is specifically
about existing production data.

---

## BE-14 — Production certificate backfill and registration 996

| | |
|---|---|
| **Status** | Partially resolved — certificate lifecycle code is fixed; production backfill remains |
| **Affected endpoint/data** | `/user-certificates/`, certificate download, volunteer registration 996 |

### What is solved

- Completed volunteer opportunities can issue certificates for attended registrations.
- The attended opportunity filter exists.
- Manual certificate issuance exists and is idempotent.
- Changing `total_hours` on an already-certified attendance record invalidates and regenerates
  the certificate without sending another issuance notification/email.
- Repeating the same hours does not regenerate the certificate or double-count profile hours.

### What remains

The backend reply explicitly says the production certificate backfill was not run and
registration 996 was not verified. The original live scenario therefore remains unconfirmed.

### Required backend action and proof

1. Deploy the latest backend code.
2. Run:

   ```bash
   php artisan fursa:backfill-missing-volunteer-certificates
   ```

3. Return the issued/skipped/error counts.
4. Verify registration `996` now has `is_certified = true` and a valid certificate path.
5. Return the relevant row from `GET /api/user-certificates/` showing:

   ```json
   {
     "registration_id": 996,
     "registration_type": "volunteer"
   }
   ```

6. Verify the certificate download succeeds when both `registration_id=996` and
   `registration_type=volunteer` are supplied.
7. Confirm the volunteer's total hours remain correct after the backfill; issuance must not add
   attendance hours a second time.

Do not close BE-14 until this live registration is verified.

---

## BE-17 — Repair legacy Learn & Serve choice values

| | |
|---|---|
| **Status** | Partially resolved — new writes are protected; legacy null rows remain |
| **Affected fields** | `learning_type_id`, `format_id`, `certificate_type_id` |
| **Primary example** | Learn & Serve opportunity 30 |

### What is solved

- `learning_type_id` and `format_id` are required on create.
- They cannot be explicitly cleared on update.
- Each ID is validated against its correct MasterChoice vocabulary.
- `certificate_type_id` is required for Course and Internship records.
- Raw relation IDs are returned alongside display values.
- `requires_check_in` remains the authoritative behavior flag.

### What remains

These validation changes do not repair historical rows that already contain null choice IDs.
The backend reply explicitly leaves opportunity 30 and other legacy records for an
owner-confirmed data repair.

### Required backend action and proof

1. Export the IDs and current titles of every active Learn & Serve row where either
   `learning_type_id` or `format_id` is null.
2. Include rows of type Course/Internship whose `certificate_type_id` is null.
3. Ask each owning organization to confirm the real values; do not bulk-fill guessed defaults.
4. Patch the confirmed IDs.
5. Return `GET /api/learn-serve-opportunities/30/` and show non-null raw IDs and display values.
6. Report how many rows remain unresolved because the owner has not confirmed the data.

BE-17 remains open until the legacy production rows are repaired or an explicit product/data
decision accepts them as permanently unknown.

---

## BE-20 — Audit and repair legacy event type values

| | |
|---|---|
| **Status** | Partially resolved — future writes are protected; historical data remains unaudited |
| **Affected field** | `events.event_type_id` / `event_type_display` |
| **Primary example** | Event 19 |

### What is solved

- New event creation requires `event_type_id`.
- Event reads serialize the selected type using the documented display shape.
- Unknown write keys are rejected instead of being silently discarded.

### What remains

The backend reply contains no production SQL result and confirms that event 19 was not
repaired. Therefore the original `event_type_display: null` response remains a production data
issue.

### Required backend action and proof

1. Run in production:

   ```sql
   SELECT id, event_type_id
   FROM events
   WHERE is_deleted = 0
   ORDER BY id DESC;
   ```

2. Report the number of active rows whose `event_type_id` is null.
3. Obtain owner-confirmed event types for those rows; do not infer a type from the title.
4. Repair event 19 and the other confirmed rows.
5. Return:

   ```http
   GET /api/events/19/
   ```

6. Show a non-null response value with this shape:

   ```json
   {
     "event_type_display": {
       "id": 0,
       "choice_type": "event_type",
       "value_en": "...",
       "value_ar": "..."
     }
   }
   ```

BE-20 remains open until production event 19 and the wider null-row audit are verified.

---

## BE-34 — Achievement report PDF 500s in production (mPDF not installed)

| | |
|---|---|
| **Status** | Open — code is correct, the production deployment is missing the dependency |
| **Endpoint** | `GET /api/volunteer-detail/?download=true` |
| **Screen** | `/achievement-reports` → "Export report" button |
| **Reported** | 2026-09-10 |
| **Relates to** | BE-19 (the feature itself, verified in code) |

### Observed response

HTTP 500, an unhandled `Error` instead of the standard envelope:

```json
{
  "message": "Class \"Mpdf\\Mpdf\" not found",
  "exception": "Error",
  "file": "/home/fursa/portal/app/Services/Report/AchievementReportRenderer.php",
  "line": 34,
  "trace": ["... 44 frames ..."]
}
```

### Root cause

This is a deployment problem, not an application-code problem. The dependency is declared and
locked, but the class is not autoloadable on the server:

- `composer.json` requires `"mpdf/mpdf": "^8.3"`;
- `composer.lock` pins `mpdf/mpdf` at `v8.3.1`;
- `app/Services/Report/AchievementReportRenderer.php:12` imports `Mpdf\Mpdf` and line 34
  instantiates it — exactly the line in the trace;
- `tests/Feature/AchievementReportPdfTest.php` asserts a real `%PDF-` body, so the code path is
  covered and passes wherever `vendor/` is complete.

A `Class ... not found` at that line therefore means the production `vendor/` predates the
`mpdf/mpdf` requirement: `composer install` was not run (or ran against a stale lock, or the
release reused a cached `vendor/`) after BE-19 was merged. The composer autoloader also has to
be regenerated; a copied `vendor/` with an old `autoload_static.php` fails the same way.

### Required backend action and proof

1. On the production host, from the application root:

   ```bash
   composer install --no-dev --optimize-autoloader
   composer dump-autoload --optimize
   php artisan optimize:clear
   ```

2. Return the output of:

   ```bash
   composer show mpdf/mpdf | head -3
   php -r 'require "vendor/autoload.php"; var_dump(class_exists("Mpdf\\Mpdf"));'
   ```

3. Confirm mPDF's temporary directory is writable by the PHP-FPM user. mPDF writes font cache
   and temp files on every render, and the renderer passes no `tempDir`, so it uses the default.
   A read-only path fails on the *next* line with `\Mpdf\MpdfException: Temporary files
   directory is not writable`, which would look like a new bug rather than the same deploy.

4. Return the production request with headers, showing `Content-Type: application/pdf` and a
   body starting `%PDF-`:

   ```bash
   curl -sS -D - -o /tmp/report.pdf \
     -H 'Authorization: Token <volunteer token>' \
     -H 'x-lang: ar' \
     'https://portal.fursa.raiyan.cc/api/volunteer-detail/?download=true'
   head -c 5 /tmp/report.pdf
   ```

   Please do this once with `x-lang: ar` and once with `x-lang: en` — the renderer switches
   `directionality` from the request locale, and RTL output is the case most likely to regress.

### Two follow-ups on the same endpoint

Both are backend-side and independent of the install above.

1. **The failure did not use the standard envelope.** `VolunteerStatisticsController::volunteerDetail()`
   calls the renderer with no `try`/`catch`, so any render failure escapes as a raw framework
   error. Every client on this endpoint expects `{ key, msg, code, response_status, data }`.
   Please wrap the render and return, on failure:

   ```json
   {
     "key": "fail",
     "msg": "<localized message>",
     "code": 500,
     "response_status": { "error": true, "validation_errors": [] },
     "data": null
   }
   ```

   with the underlying exception logged server-side. The frontend already distinguishes a
   non-PDF body from a PDF one and shows the envelope `msg` when there is one, so this alone
   turns a silent generic error into a real message for the user.

2. **`APP_DEBUG` appears to be enabled in production.** The response above contains
   `file`, `line`, and a 44-frame `trace` with absolute server paths (`/home/fursa/portal/...`)
   and the full middleware stack. `config/app.php` reads `env('APP_DEBUG', false)`, so this is
   environment configuration. Please set `APP_DEBUG=false` in the production `.env` and run
   `php artisan config:cache`. Leaking paths and the dependency tree to any authenticated
   caller is a disclosure issue independent of this bug.

BE-34 remains open until the production `curl` above returns a `%PDF-` body in both languages.

---

## Reply format

Return one Markdown file named `BACKEND_REPLY_<YYYY-MM-DD>.md` containing:

- the full test-suite result;
- deployment commit/hash;
- one section for each remaining ID: `BE-01`, `BE-14`, `BE-17`, `BE-20`, and `BE-34`;
- command/SQL output and the requested production API evidence;
- a clear `Done`, `Not done`, or `Blocked` status for each ID.

If a production operation cannot be executed from the backend developer's environment, mark it
`Blocked` and name the deployment/data owner who must perform it; do not mark the issue
resolved based only on local fixture tests.
