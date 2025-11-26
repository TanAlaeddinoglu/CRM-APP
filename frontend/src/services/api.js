// src/services/api.js
import axios from "axios";
import Cookies from "js-cookie";

export const api = axios.create({
  baseURL: "http://localhost:8000",
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


api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response && error.response.status === 401) {
      // Access token expired or invalid
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");

      // Force redirect to login
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);
