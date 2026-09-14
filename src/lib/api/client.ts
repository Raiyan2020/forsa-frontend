import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { API_BASE_URL } from "@/lib/api/config";
import { normalizeDigitsDeep } from "@/lib/digits";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    // Get token and language from Zustand stores
    const token = useAuthStore.getState().user?.auth_token;
    const language = useLanguageStore.getState().language || "en";

    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    config.headers["x-lang"] = language;
    config.headers["Accept-Language"] = language;
    // The social-auth endpoints localize their messages from `Lang`.
    config.headers["Lang"] = language;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Only 401 means "this token is no longer a session". The API answers an
 * authenticated-but-not-permitted request with 403 — "Only organizations can
 * create events.", "You can only update your own events.", "Only the event
 * organizer can view all registrations." and ~60 more — so logging out on 403
 * ejected a perfectly valid session whenever the user hit a permission wall.
 * A missing or expired token is a 401 from `Authenticate::unauthenticated()`;
 * nothing in the API returns 403 for a credential problem.
 */
apiClient.interceptors.response.use(
  (response) => {
    // Digits do not follow the UI language in this product: an Arabic session
    // still renders `12345`, never `١٢٣٤٥`. The API disagrees — `ar_num()`
    // rewrites every numeric field into Arabic-Indic digits when the language
    // header is `ar`, and hands them over as strings. Normalizing once here
    // means no render site has to think about it, and arithmetic on a count
    // (`> 0`, sums, sorts) works instead of yielding NaN.
    response.data = normalizeDigitsDeep(response.data);
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    // Validation messages and field errors are localized too, and are read
    // through lib/api/errors.ts — normalize them on the same terms.
    if (error?.response?.data !== undefined) {
      error.response.data = normalizeDigitsDeep(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
