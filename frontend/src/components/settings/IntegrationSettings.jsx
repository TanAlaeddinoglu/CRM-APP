import { useEffect, useState } from "react";
import { RotateCcw, Settings2 } from "lucide-react";
import { toast } from "react-hot-toast";
import ConfirmModal from "../common/ConfirmModal.jsx";
import EmailSettingsModal from "./EmailSettingsModal.jsx";
import {
  getEmailSettingsErrorMessage,
  getEmailConfiguration,
  resetEmailConfiguration,
} from "../../services/emailSettings.js";

export default function IntegrationSettings() {
  const [showMailSettings, setShowMailSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [configuration, setConfiguration] = useState(null);

  const loadConfiguration = () => {
    setIsLoading(true);
    getEmailConfiguration()
      .then((response) => {
        setConfiguration(response.data?.configuration || null);
      })
      .catch(() => {
        toast.error(getEmailSettingsErrorMessage("load"));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const handleReset = () => {
    setIsResetting(true);

    resetEmailConfiguration()
      .then(() => {
        setConfiguration(null);
        setShowResetConfirm(false);
        toast.success("Mail konfigürasyonu sıfırlandı.");
      })
      .catch(() => {
        toast.error(getEmailSettingsErrorMessage("reset"));
      })
      .finally(() => {
        setIsResetting(false);
      });
  };

  return (
    <>
      <div className="settings-panel-grid settings-panel-grid-single">
        <article className="settings-card">
          <div className="settings-card-header">
            <h2>Bağlı Servisler</h2>
          </div>
          <div className="settings-field-list">
            <div className="settings-field-row">
              <div>
                <strong>E-posta sağlayıcısı</strong>
                <p>
                  {configuration
                    ? `${configuration.host}:${configuration.port} üzerinden gönderim yapılıyor.`
                    : "Henüz kayıtlı bir mail konfigürasyonu bulunmuyor."}
                </p>
              </div>
              <div className="settings-field-actions">
                <span
                  className={`settings-badge ${configuration ? "success" : ""}`}
                >
                  {isLoading ? "Yükleniyor" : configuration ? "Bağlı" : "Pasif"}
                </span>
                <button
                  type="button"
                  className="settings-action-button"
                  onClick={() => setShowMailSettings(true)}
                >
                  <Settings2 size={16} aria-hidden="true" />
                  Konfigürasyon
                </button>
                <button
                  type="button"
                  className="settings-icon-button"
                  onClick={() => setShowResetConfirm(true)}
                  aria-label="Mail ayarlarını sıfırla"
                  title="Sıfırla"
                  disabled={!configuration || isResetting || isLoading}
                >
                  <RotateCcw size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <EmailSettingsModal
        open={showMailSettings}
        onClose={() => setShowMailSettings(false)}
        onSaved={() => {
          loadConfiguration();
          setShowMailSettings(false);
        }}
      />

      <ConfirmModal
        open={showResetConfirm}
        title="Mail Ayarlarını Sıfırla"
        description="Kayıtlı Mail ayarları silinecek. Bu işlemden sonra yeni bir mail konfigürasyonu tanımlanana kadar sistem mail gönderemez. Onaylıyor musun?"
        confirmText="Evet, Sıfırla"
        cancelText="Vazgeç"
        onCancel={() => {
          if (isResetting) return;
          setShowResetConfirm(false);
        }}
        onConfirm={handleReset}
      />
    </>
  );
}
