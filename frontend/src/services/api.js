// src/services/api.js
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { clearExportHistoryCache } from "./export.js";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    const csrftoken = Cookies.get("csrftoken");
    if (csrftoken && !config.headers["X-CSRFToken"]) {
      config.headers["X-CSRFToken"] = csrftoken;
    }
  }
  return config;
});

const refreshEndpoint = "/accounts/token/refresh/";
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post(refreshEndpoint, null, { skipAuthRefresh: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const forceLogout = () => {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
  clearExportHistoryCache();
  window.location.href = "/login";
};

/**
 * Extracts a human-readable message from DRF standardized error responses.
 * Supports both drf_standardized_errors format and plain {detail} responses.
 */
const extractErrorMessage = (data) => {
  if (!data) return null;

  // drf_standardized_errors format: { type, errors: [{ detail, code, attr }] }
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const messages = data.errors
      .map((e) => {
        const field = e.attr && e.attr !== "non_field_errors" ? `${e.attr}: ` : "";
        return `${field}${e.detail}`;
      })
      .slice(0, 3); // show at most 3 errors
    return messages.join("\n");
  }

  // Plain DRF format: { detail: "..." }
  if (typeof data.detail === "string") return data.detail;

  // Field-level errors: { field: ["error"] }
  if (typeof data === "object") {
    const entries = Object.entries(data)
      .filter(([, v]) => v)
      .map(([k, v]) => {
        const msg = Array.isArray(v) ? v[0] : v;
        return k === "non_field_errors" ? String(msg) : `${k}: ${msg}`;
      })
      .slice(0, 3);
    if (entries.length) return entries.join("\n");
  }

  return null;
};

const STATUS_MESSAGES = {
  403: "Bu işlem için yetkiniz yok.",
  404: "İstenen kaynak bulunamadı.",
  500: "Sunucu hatası oluştu. Lütfen tekrar deneyin.",
  502: "Sunucuya ulaşılamıyor.",
  503: "Servis geçici olarak kullanılamıyor.",
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const { response, config } = error;
    if (!response || !config) {
      if (!navigator.onLine) toast.error("İnternet bağlantısı yok.");
      return Promise.reject(error);
    }

    const { status, data } = response;

    // 401 — try token refresh first, then logout (existing logic)
    if (status === 401) {
      const isRefreshRequest =
        typeof config.url === "string" && config.url.includes(refreshEndpoint);

      if (config.skipAuthRefresh || isRefreshRequest) {
        forceLogout();
        return Promise.reject(error);
      }

      if (!config._retry) {
        config._retry = true;
        try {
          await refreshAccessToken();
          return api(config);
        } catch (refreshError) {
          forceLogout();
          return Promise.reject(refreshError);
        }
      }

      forceLogout();
      return Promise.reject(error);
    }

    // Skip global toast when the caller opts out
    if (!config.skipGlobalToast) {
      const message =
        extractErrorMessage(data) ||
        STATUS_MESSAGES[status] ||
        `Hata ${status}: İşlem gerçekleştirilemedi.`;

      if (status >= 500) {
        toast.error(message, { duration: 6000 });
      } else if (status === 403) {
        toast.error(message, { duration: 5000 });
      } else if (status === 404) {
        toast.error(message, { duration: 4000 });
      }
      // 400/422 validation errors: components handle these themselves
    }

    return Promise.reject(error);
  }
);
