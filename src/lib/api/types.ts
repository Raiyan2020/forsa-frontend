export interface ApiResponseStatus {
  error: boolean;
  validation_errors: unknown[];
}

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  key: string;
  msg: string;
  code: number;
  response_status: ApiResponseStatus;
  data: T;
  meta?: {
    pagination?: ApiPagination;
    timestamp?: string;
  };
}

/**
 * The registration download endpoints (`volunteer-opportunity-registrations`,
 * `learn-serve-opportunities/.../registrations`, `event-registrations`) answer
 * `download=true` with JSON containing a pre-signed `downloadUrl` rather than
 * the file itself.
 */
export interface RegistrationsDownload {
  downloadUrl: string;
}

/**
 * `volunteer-opportunity-registrations` nests its download payload under the
 * standard `data` envelope field (unlike the sibling download endpoints,
 * confirmed with backend — see docs/VOLUNTEER_REGISTRATIONS_DOWNLOAD_BUG.md)
 * and additionally reports the outcome of the optional `mark_attendance` side
 * effect requested in the same call.
 */
export interface VolunteerRegistrationsDownload extends RegistrationsDownload {
  file_format?: string;
  registrations_count?: number;
  attendance_marked_count?: number;
  attendance_already_marked_count?: number;
}

export interface FaqItem {
  id: number;
  question_en: string;
  question_ar: string;
  answer_en: string;
  answer_ar: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}
