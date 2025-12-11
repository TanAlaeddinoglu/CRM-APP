import { api } from "./api";

// --- Get all appointments (admin or filtered by backend) ---
export function getAppointments(params = {}) {
  return api.get("/events/appointments/", {
    params: params,
  });
}

// --- Get a single appointment ---
export function getAppointment(id) {
  return api.get(`/events/appointments/${id}/`);
}

// --- Create appointment ---
export function createAppointment(data) {
  return api.post("/events/appointments/", data);
}

// --- Update appointment ---
export function updateAppointment(id, data) {
  return api.patch(`/events/appointments/${id}/`, data);
}

// --- Delete appointment ---
export function deleteAppointment(id) {
  return api.delete(`/events/appointments/${id}/`);
}
