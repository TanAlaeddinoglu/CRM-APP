// src/services/api.js
import axios from "axios";
import Cookies from "js-cookie";

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
  window.location.href = "/login";
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const { response, config } = error;
    if (!response || !config) {
      return Promise.reject(error);
    }

    if (response.status !== 401) {
      return Promise.reject(error);
    }

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
);
