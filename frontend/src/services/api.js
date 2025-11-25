// src/services/api.js
import axios from "axios";
import Cookies from "js-cookie";

export const api = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true
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
