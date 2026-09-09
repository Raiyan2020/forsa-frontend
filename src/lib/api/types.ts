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
 * Registration download endpoints answer `download=true` with the standard
 * API envelope whose `data` contains a pre-signed `downloadUrl`. Services
 * unwrap that envelope before returning this shape to components.
 */
export interface RegistrationsDownload {
  downloadUrl: string;
}

/**
 * Volunteer downloads additionally report the outcome of the optional
 * `mark_attendance` side effect requested in the same call.
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
