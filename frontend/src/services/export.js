import { api } from "./api";

export const EXPORT_HISTORY_CACHE_KEY = "export-history-cache-v1";
let exportHistoryCacheExpiryTimer = null;

export const clearExportHistoryCache = () => {
  if (exportHistoryCacheExpiryTimer) {
    window.clearTimeout(exportHistoryCacheExpiryTimer);
    exportHistoryCacheExpiryTimer = null;
  }
  sessionStorage.removeItem(EXPORT_HISTORY_CACHE_KEY);
};

export const scheduleExportHistoryCacheExpiry = (expiresAt) => {
  if (typeof window === "undefined") return;

  if (exportHistoryCacheExpiryTimer) {
    window.clearTimeout(exportHistoryCacheExpiryTimer);
  }

  const delay = Math.max(0, expiresAt - Date.now());
  exportHistoryCacheExpiryTimer = window.setTimeout(() => {
    clearExportHistoryCache();
  }, delay);
};

export const ensureExportHistoryCacheExpiry = () => {
  try {
    const rawValue = sessionStorage.getItem(EXPORT_HISTORY_CACHE_KEY);
    if (!rawValue) return;

    const parsed = JSON.parse(rawValue);
    if (!parsed?.expires_at) {
      clearExportHistoryCache();
      return;
    }

    if (Date.now() > parsed.expires_at) {
      clearExportHistoryCache();
      return;
    }

    scheduleExportHistoryCacheExpiry(parsed.expires_at);
  } catch {
    clearExportHistoryCache();
  }
};

export const createExportJob = (payload) => api.post("/exports/", payload);
export const getExportHistory = (params = {}) => api.get("/exports/", { params });
export const getExportHistoryMeta = () => api.get("/exports/meta/");
