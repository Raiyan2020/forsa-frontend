const DEFAULT_API_BASE_URL = "https://portal.fursa.raiyan.cc/api";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");
