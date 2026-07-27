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
