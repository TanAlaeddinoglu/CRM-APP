import { api } from "./api.js";

export function getEmailConfiguration() {
  return api.get("/notifications/email-settings/");
}

export function testEmailConfiguration(data) {
  return api.post("/notifications/email-settings/test/", data);
}

export function saveEmailConfiguration(data) {
  return api.put("/notifications/email-settings/", data);
}

export function resetEmailConfiguration() {
  return api.delete("/notifications/email-settings/");
}

const EMAIL_SETTINGS_ERROR_MESSAGES = {
  load: "Mail ayarları yüklenemedi.",
  test: "Mail ayarları test edilemedi. Bilgileri kontrol edip tekrar deneyin.",
  save: "Mail ayarları kaydedilemedi. Testi yeniden çalıştırıp tekrar deneyin.",
  reset: "Mail ayarları sıfırlanamadı.",
};

export function getEmailSettingsErrorMessage(action) {
  return EMAIL_SETTINGS_ERROR_MESSAGES[action] || "Bir hata oluştu.";
}
