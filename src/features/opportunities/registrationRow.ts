/**
 * `GET /learn-serve-opportunities/{id}/registrations/` returns a **flat** row —
 * `user_name`, `user_email`, `user_id`, `civil_id` — with no nested `user`
 * object. Both register-list screens were written against an older nested
 * shape (`user.full_name`, `user.email`, `user.phone_number`), so every cell
 * read `undefined`: the table rendered names as blank and email/phone as "-",
 * and the certificate variant threw on `rowData.user.profile_pic` outright.
 *
 * Read a row through `registrationPerson()` instead of reaching into it, so
 * either shape renders. The flat payload gained
 * `full_name`, `user_contact_number` / `phone_number`, `profile_pic`,
 * `gender_display` and `is_public` on 2026-09-07 (BE-16 in
 * `docs/BACKEND_ISSUES_ROUND_1.md`), so all of them are read flat-first, then nested.
 */

interface NestedRegistrationUser {
  id?: number | string | null;
  full_name?: string | null;
  full_name_ar?: string | null;
  email?: string | null;
  phone_number?: string | null;
  profile_pic?: string | null;
  civil_id?: string | null;
  is_public?: boolean | null;
  gender_display?: { value_en?: string | null } | null;
}

export interface RegistrationRow {
  id?: number | string;
  /** Flat shape (current). */
  user_id?: number | string | null;
  /**
   * `full_name` is the field both registration endpoints now agree on (added to
   * the learn-serve one on 2026-09-07, BE-16); `user_name` stays as its older
   * alias and is still sent.
   */
  full_name?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  civil_id?: string | null;
  profile_pic?: string | null;
  gender_display?: { value_en?: string | null } | null;
  is_public?: boolean | null;
  /** Volunteer-registrations shape, still used by other endpoints. */
  user_full_name?: string | null;
  user_contact_number?: string | null;
  phone_number?: string | null;
  /** Nested shape (legacy). */
  user?: NestedRegistrationUser | null;
}

export interface RegistrationPerson {
  /** The registered user's own id — for the profile link. */
  userId?: number | string;
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  civilId: string;
  profilePic: string;
  genderEn: string;
  /** Undefined when the payload doesn't say; callers route to the private profile. */
  isPublic?: boolean;
}

export function registrationPerson(
  row: RegistrationRow | null | undefined
): RegistrationPerson {
  const user = row?.user ?? undefined;
  const name =
    row?.full_name || row?.user_name || row?.user_full_name || user?.full_name || "";

  return {
    userId: user?.id ?? row?.user_id ?? undefined,
    name,
    // Only the nested shape ever carried an Arabic name; fall back to the one name we have.
    nameAr: user?.full_name_ar || name,
    email: row?.user_email || user?.email || "",
    phone: row?.user_contact_number || user?.phone_number || row?.phone_number || "",
    civilId: row?.civil_id || user?.civil_id || "",
    profilePic: row?.profile_pic || user?.profile_pic || "",
    genderEn: row?.gender_display?.value_en || user?.gender_display?.value_en || "",
    isPublic: row?.is_public ?? user?.is_public ?? undefined,
  };
}
