import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import ConfirmModal from "../common/ConfirmModal.jsx";
import {
  getEmailSettingsErrorMessage,
  getEmailConfiguration,
  saveEmailConfiguration,
  testEmailConfiguration,
} from "../../services/emailSettings.js";

const INITIAL_FORM = {
  host: "smtp.mail.example.com",
  port: "587",
  hostUser: "notifications@example.com",
  hostPassword: "",
  defaultFromEmail: "crm@example.com",
};

export default function EmailSettingsModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isTested, setIsTested] = useState(false);
  const [testSessionId, setTestSessionId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const payload = useMemo(
    () => ({
      name: "Primary SMTP",
      host: form.host.trim(),
      port: Number(form.port),
      host_user: form.hostUser.trim(),
      host_password: form.hostPassword,
      default_from_email: form.defaultFromEmail.trim(),
      use_tls: true,
      use_ssl: false,
    }),
    [form]
  );

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setIsLoading(true);

    getEmailConfiguration()
      .then((response) => {
        if (!isMounted) return;

        const configuration = response.data?.configuration;
        if (!configuration) {
          setForm(INITIAL_FORM);
          return;
        }

        setForm((prev) => ({
          ...prev,
          host: configuration.host || "",
          port: String(configuration.port || ""),
          hostUser: "",
          hostPassword: "",
          defaultFromEmail: configuration.default_from_email || "",
        }));
      })
      .catch(() => {
        if (!isMounted) return;
        toast.error(getEmailSettingsErrorMessage("load"));
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
        setIsTested(false);
        setTestSessionId(null);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsTested(false);
    setTestSessionId(null);
  };

  const validateForm = () => {
    if (!form.host.trim()) {
      toast.error("Host alanı zorunlu.");
      return false;
    }
    if (!form.port.trim()) {
      toast.error("Port alanı zorunlu.");
      return false;
    }
    if (!form.hostUser.trim()) {
      toast.error("Host user alanı zorunlu.");
      return false;
    }
    if (!form.hostPassword.trim()) {
      toast.error("Host password alanı zorunlu.");
      return false;
    }
    if (!form.defaultFromEmail.trim()) {
      toast.error("Varsayılan mail alanı zorunlu.");
      return false;
    }

    return true;
  };

  const handleTest = () => {
    if (!validateForm()) return;

    setIsTesting(true);

    testEmailConfiguration(payload)
      .then((response) => {
        setIsTested(true);
        setTestSessionId(response.data.test_session_id);
        toast.success("Mail ayarları test edildi.");
      })
      .catch((error) => {
        setIsTested(false);
        setTestSessionId(null);
        toast.error(getEmailSettingsErrorMessage("test"));
      })
      .finally(() => {
        setIsTesting(false);
      });
  };

  const handleConfirmSave = () => {
    if (!testSessionId) return;

    setIsSaving(true);

    saveEmailConfiguration({
      ...payload,
      test_session_id: testSessionId,
    })
      .then(() => {
        setShowConfirm(false);
        toast.success("Mail ayarları kaydedildi.");
        onSaved?.();
        onClose();
      })
      .catch((error) => {
        toast.error(getEmailSettingsErrorMessage("save"));
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (!open) return null;

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-box settings-modal-box">
          <h2 className="modal-title">Mail Ayarları</h2>

          <div className="modal-body">
            <div className="modal-row">
              <label>Host</label>
              <input
                name="host"
                value={form.host}
                onChange={handleChange}
                disabled={isLoading || isTesting || isSaving}
              />
            </div>

            <div className="modal-row">
              <label>Port</label>
              <input
                name="port"
                value={form.port}
                onChange={handleChange}
                disabled={isLoading || isTesting || isSaving}
              />
            </div>

            <div className="modal-row">
              <label>Host User</label>
              <input
                name="hostUser"
                value={form.hostUser}
                onChange={handleChange}
                placeholder="Kaydetmek için yeniden girin"
                disabled={isLoading || isTesting || isSaving}
              />
            </div>

            <div className="modal-row">
              <label>Host Password</label>
              <input
                name="hostPassword"
                type="password"
                value={form.hostPassword}
                onChange={handleChange}
                placeholder="Kaydetmek için yeniden girin"
                disabled={isLoading || isTesting || isSaving}
              />
            </div>

            <div className="modal-row">
              <label>Varsayılan Mail</label>
              <input
                name="defaultFromEmail"
                type="email"
                value={form.defaultFromEmail}
                onChange={handleChange}
                disabled={isLoading || isTesting || isSaving}
              />
            </div>

            <div className="settings-test-state">
              <span
                className={`settings-badge ${isTested ? "success" : ""}`}
              >
                {isTested ? "Test başarılı" : "Test bekleniyor"}
              </span>
            </div>
          </div>

          <div className="modal-footer settings-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isTesting || isSaving}
            >
              İptal
            </button>

            <div className="settings-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleTest}
                disabled={isLoading || isTesting || isSaving}
              >
                {isTesting ? "Test Ediliyor" : "Test Et"}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!isTested || !testSessionId || isSaving || isTesting}
                onClick={() => setShowConfirm(true)}
              >
                {isSaving ? "Kaydediliyor" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Mail Ayarlarını Kaydet"
        description="Testi başarılı olan Mail ayarları kaydedilecek ve sistem bu ayarları kullanarak mail gönderecek. Onaylıyor musun?"
        confirmText="Evet, Kaydet"
        cancelText="Vazgeç"
        onCancel={() => {
          if (isSaving) return;
          setShowConfirm(false);
        }}
        onConfirm={handleConfirmSave}
      />
    </>
  );
}
