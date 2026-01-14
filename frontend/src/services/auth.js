// src/services/auth.js
import { api } from "./api.js";
import Cookies from "js-cookie";


export function login(data) {
  return api.post("/accounts/login/", data, {
    withCredentials: true,
    headers: {
      "X-CSRFToken": Cookies.get("csrftoken"),
    },
  });
}

export function logout() {
  return api.post("/accounts/logout/", null, {
    withCredentials: true,
    headers: {
      "X-CSRFToken": Cookies.get("csrftoken"),
    },
  });
}

export function me() {
  return api.get("/accounts/profile/");
}

export function getCSRF() {
  return api.get("/accounts/csrf/", { withCredentials: true });
}
