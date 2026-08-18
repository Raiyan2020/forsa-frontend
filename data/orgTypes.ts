/**
 * Organisation types come from `GET /api/choices/org_type/`, so the list itself
 * is never hardcoded — but two of them register without a licence: `Public`
 * and the newer `Community`. The API reports the same thing through
 * `GET /api/check-license-requirement/` once the org is signed in; during
 * sign-up there is no token yet, so the type's English value decides.
 */
const LICENSE_EXEMPT_ORG_TYPES = ["Public", "Community"];

export function isLicenseExemptOrgType(rawValue?: string | null): boolean {
  if (!rawValue) return false;
  return LICENSE_EXEMPT_ORG_TYPES.some(
    (type) => type.toLowerCase() === rawValue.trim().toLowerCase()
  );
}
