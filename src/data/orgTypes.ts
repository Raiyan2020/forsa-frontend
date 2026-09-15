/**
 * Organisation types come from `GET /api/choices/org_type/`, so the list itself
 * is never hardcoded — the labels shown in the dropdown are always whatever the
 * API returns. The two things below are the exceptions, and both exist because
 * they are decisions the client has to make *before* there is a token:
 *
 *  - the licence rule, which `GET /api/check-license-requirement/` cannot answer
 *    during sign-up;
 *  - the order the six choices are offered in, which the API does not carry.
 *
 * ### The classification history
 *
 * First restructure (backend migration `2026_08_23_000003`):
 *
 *   Government / Public → Institution
 *   Private / Company   → Commercial
 *   Community           → Society
 *
 * Second restructure (backend migration `2026_09_15_000001`). Six visible
 * types, with `Society` splitting in two:
 *
 *   Institution → Governmental   حكومي
 *   Commercial  → Commercial     تجاري        (label change only)
 *   Education   → Educational    تعليمي
 *   NGO         → NonProfit      غير ربحي
 *   Society     → Association    جمعية        ← splits
 *   (new)         Community      مجتمع        ← splits
 *
 * Every name from all three generations remains recognised here during
 * rollout, including cached responses from deployments on the old vocabulary.
 */

/**
 * Types that are **not** asked for a licence at sign-up.
 *
 * `Society` and the incoming `Association` are the same classification either
 * side of the rename, so both are listed — otherwise the backend rename would
 * silently start demanding a licence from every cooperative society. `Community`
 * covers both the pre-`2026_08_23` value and the new split-out type, and
 * `Public` is kept for a record that predates the first restructure.
 *
 * NOTE — `Institution`, and its successor `Governmental`, are deliberately
 * absent. `Institution` absorbed both `Public` (licence-exempt) and `Government`
 * (not), so whether it should be exempt is genuinely ambiguous and is one of the
 * open questions on the licence rules. Leaving them out means a government body
 * is asked for a licence, which is the safe direction: the backend rejects a
 * licence it does not need far more gracefully than it accepts a missing one.
 */
const LICENSE_EXEMPT_ORG_TYPES = [
  "Society",
  "Association",
  "Community",
  "Public",
];

export function isLicenseExemptOrgType(rawValue?: string | null): boolean {
  if (!rawValue) return false;
  return LICENSE_EXEMPT_ORG_TYPES.some(
    (type) => type.toLowerCase() === rawValue.trim().toLowerCase()
  );
}

/**
 * The order the client asked for — حكومي، تجاري، تعليمي، غير ربحي، جمعية، مجتمع
 * — with each entry's old name beside its new one so the order holds both
 * before and after the backend rename.
 *
 * `Volunteer Team` is absent on purpose: it is never offered in the dropdown
 * (that path only arrives through the JoinUs shortcut), and anything not listed
 * here sorts to the end rather than disappearing.
 */
const ORG_TYPE_DISPLAY_ORDER = [
  "Governmental",
  "Institution",
  "Commercial",
  "Educational",
  "Education",
  "NonProfit",
  "NGO",
  "Association",
  "Society",
  "Community",
];

const orgTypeRank = (rawValue?: string | null): number => {
  const normalized = rawValue?.trim().toLowerCase() ?? "";
  const index = ORG_TYPE_DISPLAY_ORDER.findIndex(
    (type) => type.toLowerCase() === normalized
  );
  return index === -1 ? ORG_TYPE_DISPLAY_ORDER.length : index;
};

/**
 * Sorts org-type dropdown options into the client's order. Returns a new array
 * — the input usually comes straight from a `useMemo` over the query data, and
 * sorting that in place would mutate the cached response.
 */
/**
 * A single org-type dropdown entry. `rawValue` is the API's `value_en`, kept
 * alongside the localized `label` because every rule in this file — the licence
 * exemption, the order, the "Volunteer Team" filter — keys on the English name,
 * which is stable across languages while the label is not.
 */
export interface OrgTypeOption {
  label: string;
  value: string;
  rawValue: string;
}

export function sortOrgTypeOptions<T>(options: T[]): T[] {
  const rawValueOf = (option: T) =>
    (option as { rawValue?: string | null } | null)?.rawValue;

  return [...options].sort(
    (a, b) => orgTypeRank(rawValueOf(a)) - orgTypeRank(rawValueOf(b))
  );
}
