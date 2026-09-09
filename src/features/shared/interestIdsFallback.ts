import { getApiFieldErrors } from "@/lib/api/errors";

/**
 * Temporary bridge for BE-23: the interest pickers cannot produce ids the
 * create/update endpoints will accept.
 *
 * Every interest picker in the app is fed from `/choices/{type}_interest/`, so
 * it offers **MasterChoice** ids (volunteer 71–88, event 110–132). The
 * create/update endpoints validate `interest_ids` with an `exists` rule against
 * the **`Interest`** table instead, and no endpoint exposes that table's ids —
 * `/interests/` and `/choices/interest/` both 404. BE-01's reply confirms the
 * direction: `Interest` is canonical and the MasterChoice pivots are "dead data
 * waiting to be bridged".
 *
 * Before the field was renamed to `interest_ids` it was sent as `_interests`,
 * which no controller read at all — which is why `interest_display` is `[]` on
 * every live record (BE-01). So both vocabularies fail; one silently, one with a
 * 422 that blocks creation entirely.
 *
 * Until the endpoints bridge MasterChoice ids by name, this sends the correct
 * payload first and only retries without the tags when the API rejects *those
 * ids specifically*. The retry is safe: Laravel validates before it writes, so a
 * 422 means nothing was created or changed.
 *
 * This heals itself — once the ids are accepted the first attempt succeeds, the
 * caller sees `interestsDropped: false`, and there is no flag to remember to
 * turn off. Delete this module when BE-23 closes.
 */

const INTEREST_IDS_KEY = "interest_ids[]";

/** A validation failure caused *only* by the interest ids we sent. */
export function isInterestIdsOnlyValidationError(error: unknown): boolean {
  const fields = Object.keys(getApiFieldErrors(error));
  // Laravel reports per-element failures as `interest_ids.0`, `interest_ids.1`…
  return (
    fields.length > 0 &&
    fields.every((field) => field.replace(/\.\d+$/, "") === "interest_ids")
  );
}

function withoutInterestIds(formData: FormData): FormData {
  const stripped = new FormData();
  formData.forEach((value, key) => {
    if (key !== INTEREST_IDS_KEY) stripped.append(key, value);
  });
  return stripped;
}

/**
 * Run a multipart submit, retrying once without `interest_ids[]` if — and only
 * if — the API rejected those ids and nothing else.
 *
 * `interestsDropped` tells the caller whether to warn that the tags were not
 * saved, so an incomplete record is never written silently.
 */
export async function submitToleratingInterestIds<T>(
  formData: FormData,
  submit: (payload: FormData) => Promise<T>
): Promise<{ result: T; interestsDropped: boolean }> {
  try {
    return { result: await submit(formData), interestsDropped: false };
  } catch (error) {
    if (
      !formData.has(INTEREST_IDS_KEY) ||
      !isInterestIdsOnlyValidationError(error)
    ) {
      throw error;
    }
    return {
      result: await submit(withoutInterestIds(formData)),
      interestsDropped: true,
    };
  }
}
