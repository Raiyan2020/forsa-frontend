import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { API_BASE_URL } from "@/lib/api/config";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    // Get token and language from Zustand stores
    const token = useAuthStore.getState().user?.auth_token;
    const language = useLanguageStore.getState().language;

    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    config.headers["x-lang"] = language || "en";

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
