/**
 * Opportunity payloads carry their tags in two different shapes:
 *
 * - `interest_display` — the older choice-table shape (`value_en` / `value_ar`).
 * - `interests` — the current shape (`name_en` / `name_ar` + `interest_type`).
 *
 * The detail endpoints now send `interest_display: null` and populate
 * `interests`, while list endpoints still return the old key, so read both and
 * normalise to a single `value_en` / `value_ar` shape.
 */

export interface InterestTag {
  id: string | number;
  value_en: string;
  value_ar: string;
}

interface InterestDisplayItem {
  id?: string | number | null;
  value_en?: string | null;
  value_ar?: string | null;
}

interface InterestItem {
  id?: string | number | null;
  name_en?: string | null;
  name_ar?: string | null;
  interest_type?: string | null;
}

export function normalizeInterests(
  interestDisplay?: InterestDisplayItem[] | null,
  interests?: InterestItem[] | null
): InterestTag[] {
  if (interestDisplay?.length) {
    return interestDisplay.map((interest, index) => ({
      id: interest.id ?? index,
      value_en: interest.value_en ?? "",
      value_ar: interest.value_ar ?? "",
    }));
  }

  return (interests ?? []).map((interest, index) => ({
    id: interest.id ?? index,
    value_en: interest.name_en ?? "",
    value_ar: interest.name_ar ?? "",
  }));
}

/** Label for the current language, falling back to the other one when empty. */
export function interestLabel(tag: InterestTag, language: string): string {
  const preferred = language === "ar" ? tag.value_ar : tag.value_en;
  return preferred || tag.value_ar || tag.value_en || "";
}

/**
 * Map an opportunity's tags onto the ids of the `/choices/*_interest/`
 * dropdown that feeds `TagsCheckbox`. `interests` comes from its own table, so
 * its ids don't necessarily match the choice ids — fall back to matching on the
 * label before keeping the raw id, and drop tags that resolve to nothing so the
 * form never submits an id the backend won't accept.
 */
export function resolveInterestOptionIds(
  tags: InterestTag[],
  options: Array<{ id: string | number; label: string }>
): string[] {
  return tags
    .map((tag) => {
      const byId = options.find((option) => String(option.id) === String(tag.id));
      if (byId) return String(byId.id);

      const labels = [tag.value_en, tag.value_ar]
        .filter(Boolean)
        .map((value) => value.trim().toLowerCase());
      const byLabel = options.find((option) =>
        labels.includes(String(option.label ?? "").trim().toLowerCase())
      );
      if (byLabel) return String(byLabel.id);

      return options.length ? "" : String(tag.id);
    })
    .filter(Boolean);
}
