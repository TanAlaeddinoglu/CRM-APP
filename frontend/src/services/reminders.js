import { api } from "./api.js";

// ── Zamanlayıcı (hatırlatma) kuralları — ayarlar sayfası ─────────────────────
export function getReminderRules() {
  return api.get("/notifications/reminders/rules/");
}

export function createReminderRule(data) {
  return api.post("/notifications/reminders/rules/", data);
}

export function updateReminderRule(id, data) {
  return api.patch(`/notifications/reminders/rules/${id}/`, data);
}

export function deleteReminderRule(id) {
  return api.delete(`/notifications/reminders/rules/${id}/`);
}

export function getReminderConditionFields() {
  return api.get("/notifications/reminders/condition-fields/");
}

const REMINDER_ERROR_MESSAGES = {
  load: "Hatırlatma kuralları yüklenemedi.",
  create: "Hatırlatma kuralı oluşturulamadı.",
  update: "Hatırlatma kuralı güncellenemedi.",
  delete: "Hatırlatma kuralı silinemedi.",
};

export function getReminderError(action) {
  return REMINDER_ERROR_MESSAGES[action] || "Bir hata oluştu.";
}
