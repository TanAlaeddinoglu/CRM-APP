import { api } from "./api.js";

// ── Feed (header bell) ────────────────────────────────────────────────────────
export function getNotifications(params) {
  return api.get("/notifications/", { params });
}

export function markNotificationRead(id) {
  return api.post(`/notifications/${id}/mark-read/`);
}

export function markAllNotificationsRead() {
  return api.post("/notifications/mark-all-read/");
}

export function deleteNotification(id) {
  return api.delete(`/notifications/${id}/delete/`);
}

export function deleteAllNotifications() {
  return api.delete("/notifications/delete-all/");
}

export function getUnreadCount() {
  return api.get("/notifications/unread-count/");
}

// ── Rules / Types (settings page) ────────────────────────────────────────────
export function getNotificationTypes() {
  return api.get("/notifications/types/");
}

export function getNotificationRules() {
  return api.get("/notifications/rules/");
}

export function createNotificationRule(data) {
  return api.post("/notifications/rules/", data);
}

export function updateNotificationRule(id, data) {
  return api.patch(`/notifications/rules/${id}/`, data);
}

export function deleteNotificationRule(id) {
  return api.delete(`/notifications/rules/${id}/`);
}

const NOTIFICATION_ERROR_MESSAGES = {
  load: "Bildirim kuralları yüklenemedi.",
  create: "Kural oluşturulamadı.",
  update: "Kural güncellenemedi.",
  delete: "Kural silinemedi.",
};

export function getNotificationError(action) {
  return NOTIFICATION_ERROR_MESSAGES[action] || "Bir hata oluştu.";
}
