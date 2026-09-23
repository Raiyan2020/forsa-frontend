/**
 * `GET /opportunities/{id}/details/` — the shape `VolunteerOpportunityResource`
 * actually returns, field for field.
 *
 * Kept deliberately honest in both directions:
 *
 *  - **Everything the resource sends is here**, including the server-computed
 *    flags (`is_full`, `has_started`, `has_ended`, `time_slots[].hours`) the
 *    page used to re-derive locally with its own date heuristics. Where the
 *    server computes something, the page prefers the server's answer.
 *  - **Nothing it does not send is here**, with three exceptions marked below,
 *    each one a field the page has a real use for and has asked the backend to
 *    start sending (BE-80). Reading a field the API never returns is how
 *    `rejected_reason` came to be rendered for a year without ever appearing.
 *
 * `all_registered_user` is sent but omitted on purpose. It carries every
 * registered volunteer's email address on a public endpoint (BE-80); nothing
 * on this page may come to depend on it.
 */

export interface ChoiceDisplay {
  id?: string | number | null;
  value_en?: string | null;
  value_ar?: string | null;
}

export interface OpportunityImage {
  id: number;
  image: string;
  is_after_completed?: boolean;
}

export interface OpportunitySponsorImage {
  id: number | string;
  image: string;
  organization: number;
  position: number;
}

export interface OpportunityTimeSlot {
  id?: number;
  /** `YYYY-MM-DD`. */
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  /**
   * The slot's length, computed by `durationInHours()` — which rolls an
   * overnight shift forward a day. Prefer it to subtracting the times here.
   */
  hours?: number | null;
}

export interface OpportunityInterest {
  id: number | string;
  name_en: string;
  name_ar: string;
  interest_type?: string;
}

export interface OpportunityInterestDisplay {
  id: string | number;
  value_en: string;
  value_ar: string;
}

/**
 * `created_by` is the organizer's full `CustomUserResource`. Only the fields
 * this page renders are typed; the rest (email, phone, date of birth, …) are
 * sent to anonymous callers and should not be (BE-80).
 */
export interface OpportunityCreator {
  id: string | number;
  full_name?: string | null;
  profile_pic?: string | null;
  is_public?: boolean;
  gender_display?: ChoiceDisplay | null;
  facebook_link?: string | null;
  twitter_link?: string | null;
  whatsapp_link?: string | null;
  instagram_link?: string | null;
  linkedin_link?: string | null;
}

/**
 * BE-61 — the viewer's own check-in state, or null when they are not
 * registered or not signed in.
 */
export interface SelfAttendanceState {
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  /** Which of the two printed codes the viewer's scanner expects next. */
  next_action?: "in" | "out" | "done" | null;
  /**
   * BE-75 B — when the departure scan stops being accepted: the session's
   * scheduled end plus the admin-configurable grace period. Non-null only
   * while a check-out is pending.
   */
  self_check_out_closes_at?: string | null;
}

export type OpportunityStatus = "upcoming" | "inprogress" | "completed" | "cancelled";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface VolunteerOpportunityDetail {
  id: number | string;
  approval_status?: ApprovalStatus | string | null;
  /** Resolved from the dates server-side; `cancelled` is the only stored override. */
  opportunity_status?: OpportunityStatus | string | null;
  opportunity_type?: "volunteer_opportunity";
  primary_language?: "en" | "ar" | string | null;

  title_en: string;
  title_ar: string;
  description_en?: string | null;
  description_ar?: string | null;

  /** ISO datetime, or null — no due date means registration runs to `end_date`. */
  due_date?: string | null;
  /** `YYYY-MM-DD`. */
  start_date: string;
  /** `YYYY-MM-DD`. */
  end_date: string;
  start_time: string;
  end_time: string;
  /** True when `time_slots` holds the real schedule rather than the date range. */
  has_custom_schedule?: boolean;
  /**
   * Present only when the organizer chose separate days. `start_date` and
   * `end_date` are then just the first and last of them — the opportunity does
   * not run on the days in between.
   */
  time_slots?: OpportunityTimeSlot[];
  volunteer_hours_per_day?: number | string | null;

  /** Falls back server-side to `location_ar`, then `location_en`. */
  map_desc?: string | null;
  location_url?: string | null;
  /** The opportunity's own WhatsApp contact — see `resolveLocationUrl`. */
  link?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | null;
  lng?: number | null;

  from_age?: number | string | null;
  to_age?: number | string | null;
  participants_needed?: number | string | null;
  registered_volunteers_count?: number | string | null;
  total_roles: number;
  gender_display?: ChoiceDisplay | null;

  opportunity_nationality?: string | null;
  /** Superseded by `opportunity_nationality`; still the fallback for old rows. */
  is_kuwaitis?: boolean;
  is_public?: boolean;
  is_supports_disabled?: boolean;
  is_relief?: boolean;
  is_urgent?: boolean;
  is_emergency?: boolean;
  is_interview_needed?: boolean;
  is_calendar?: boolean;

  volunteer_category?: string | null;
  volunteer_category_display?: { en: string; ar: string } | null;
  /** Only meaningful for charity opportunities; null otherwise. */
  beneficiaries_count?: number | null;
  supports_beneficiaries_count?: boolean;

  interests?: OpportunityInterest[] | null;
  interest_display?: OpportunityInterestDisplay[] | null;

  license_image?: string | null;
  opportunity_images: OpportunityImage[];
  opportunity_sponsor_images?: OpportunitySponsorImage[];
  after_completed_images_count?: number;

  created_by: OpportunityCreator | null;
  user_type?: string | null;
  /** The shareable detail URL. */
  registration_link?: string;

  // ── Registration ────────────────────────────────────────────────────────
  is_registered?: boolean;
  is_registration_closed?: boolean;
  is_registration_open?: boolean;
  /** One server-computed state so every screen renders the same button. */
  action_state?: string | null;
  is_full?: boolean;
  has_started?: boolean;
  has_ended?: boolean;
  is_saved_to_calendar?: boolean;
  calendar_id?: number | null;

  // ── Viewer ──────────────────────────────────────────────────────────────
  /** `organizer` / `sponsor` / `registered` / `attended`, for the current viewer. */
  relationship_tags?: string[] | null;
  has_scan_permission?: boolean;
  /**
   * BE-69 — true for the organizer and for a volunteer granted «إذن تحضير».
   * Opens the volunteer list and nothing else.
   */
  can_manage_attendance?: boolean;
  self_attendance?: SelfAttendanceState | null;

  // ── Attendance window ───────────────────────────────────────────────────
  /** Hardcoded true for volunteering, permanently (BE-78 C). */
  qr_attendance_enabled?: boolean;
  manual_attendance_enabled?: boolean;
  manual_tracking?: boolean;
  preparation_valid_until?: string | null;
  /** Hour-precise end of the check-in window; prefer it over the date-only field. */
  preparation_valid_until_at?: string | null;
  is_preparation_window_closed?: boolean;
  /** Set when an admin has reopened a window that had already closed. */
  preparation_reopened_until?: string | null;

  // ── Not sent yet — requested in BE-80 ───────────────────────────────────
  /**
   * The admin's reason for rejecting the opportunity. Stored on the model and
   * written by the admin reject action, but no resource serializes it, so the
   * rejection notice has only ever shown the heading.
   */
  rejected_reason?: string | null;
  /** Language-specific address. Only the merged `map_desc` is sent today. */
  location_en?: string | null;
  location_ar?: string | null;
}
