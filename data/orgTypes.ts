/**
 * Organisation types come from `GET /api/choices/org_type/`, so the list itself
 * is never hardcoded — but the licence rule still has to be decided during
 * sign-up, before there is a token to call
 * `GET /api/check-license-requirement/` with. That is the only reason any
 * English value appears here.
 *
 * The backend cut the list to six values and renamed the rest:
 *
 *   Government / Public → Institution
 *   Private / Company   → Commercial
 *   Community           → Society          ← the one that matters below
 *
 * `Community` and the pre-rename `Public` are kept alongside `Society` so a
 * record that has not been migrated yet still resolves.
 *
 * NOTE — `Institution` is deliberately absent. It absorbed both `Public`
 * (which was licence-exempt) and `Government` (which was not), so whether it
 * should be exempt is genuinely ambiguous and is one of the open questions on
 * the licence rules. Leaving it out means an Institution is asked for a licence,
 * which is the safe direction: the backend rejects a licence it does not need
 * far more gracefully than it accepts a missing one.
 */
const LICENSE_EXEMPT_ORG_TYPES = ["Society", "Community", "Public"];

export function isLicenseExemptOrgType(rawValue?: string | null): boolean {
  if (!rawValue) return false;
  return LICENSE_EXEMPT_ORG_TYPES.some(
    (type) => type.toLowerCase() === rawValue.trim().toLowerCase()
  );
}
