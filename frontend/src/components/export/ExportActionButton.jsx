import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";

import { createExportJob } from "../../services/export";
import { getExportModelConfig } from "./exportModels.js";
import "./ExportModal.css";

const toUnique = (items = []) => Array.from(new Set(items));

const parseExportError = (error) => {
  const data = error?.response?.data;
  if (!data) return error?.message || "Export işlemi başlatılamadı.";

  if (typeof data.detail === "string" && data.detail.trim()) return data.detail;

  if (typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }

  return "Export işlemi başlatılamadı.";
};

export default function ExportActionButton({
  model,
  initialRecipientEmail = "",
  buttonClassName = "btn-secondary",
  buttonLabel = "Export",
  disabled = false,
  onQueued,
}) {
  const config = useMemo(() => getExportModelConfig(model), [model]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fileType: config?.defaultFileType || "excel",
    recipientEmail: initialRecipientEmail || "",
    subject: "",
    body: "",
    selectedFields: toUnique(config?.defaultFields || []),
  });

  const resetForm = () => {
    setForm({
      fileType: config?.defaultFileType || "excel",
      recipientEmail: initialRecipientEmail || "",
      subject: "",
      body: "",
      selectedFields: toUnique(config?.defaultFields || []),
    });
  };

  const handleOpen = () => {
    if (!config) {
      toast.error("Bu sayfa için export konfigürasyonu bulunamadı.");
      return;
    }
    resetForm();
    setOpen(true);
  };

  const handleToggleField = (field) => {
    setForm((prev) => {
      const hasField = prev.selectedFields.includes(field);
      const selectedFields = hasField
        ? prev.selectedFields.filter((item) => item !== field)
        : [...prev.selectedFields, field];
      return { ...prev, selectedFields };
    });
  };

  const selectAll = () =>
    setForm((prev) => ({
      ...prev,
      selectedFields: config?.fields?.map((field) => field.value) || [],
    }));

  const selectDefaults = () =>
    setForm((prev) => ({
      ...prev,
      selectedFields: toUnique(config?.defaultFields || []),
    }));

  const handleSubmit = async () => {
    if (!config) return;

    if (form.selectedFields.length === 0) {
      toast.error("En az bir alan seçmelisiniz.");
      return;
    }

    const payload = {
      model: config.model,
      file_type: form.fileType,
      fields: form.selectedFields,
    };

    const recipientEmail = form.recipientEmail.trim();
    const subject = form.subject.trim();
    const body = form.body.trim();

    if (recipientEmail) payload.recipient_email = recipientEmail;
    if (subject) payload.email_subject = subject;
    if (body) payload.email_body = body;

    setSubmitting(true);
    try {
      const res = await createExportJob(payload);
      const jobId = res?.data?.job_id;
      toast.success(
        jobId ? `Export kuyruğa alındı. Job #${jobId}` : "Export kuyruğa alındı."
      );
      setOpen(false);
      if (typeof onQueued === "function") onQueued(res?.data);
    } catch (error) {
      toast.error(parseExportError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        className={buttonClassName}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
      >
        {buttonLabel}
      </button>

      {open && config && (
        <div className="export-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="export-modal-header">
              <div>
                <h3>{config.title} Export</h3>
                <p>Dosya formatı ve alanları seçip export kuyruğunu başlatın.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Kapat
              </button>
            </div>

            <div className="export-modal-body">
              <label className="export-field">
                <span>Dosya Türü</span>
                <select
                  value={form.fileType}
                  onChange={(e) => setForm((prev) => ({ ...prev, fileType: e.target.value }))}
                  disabled={submitting}
                >
                  {config.fileTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="export-field">
                <span>Alıcı E-posta (opsiyonel)</span>
                <input
                  type="email"
                  value={form.recipientEmail}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, recipientEmail: e.target.value }))
                  }
                  placeholder="boş bırakılırsa kullanıcı e-postası kullanılır"
                  disabled={submitting}
                />
              </label>

              <label className="export-field">
                <span>E-posta Konusu (opsiyonel)</span>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Örn: Müşteri listesi export"
                  disabled={submitting}
                />
              </label>

              <label className="export-field">
                <span>E-posta Mesajı (opsiyonel)</span>
                <textarea
                  rows={3}
                  value={form.body}
                  onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Örn: Ek dosyada müşteri export bulunmaktadır."
                  disabled={submitting}
                />
              </label>

              <div className="export-fields-card">
                <div className="export-fields-header">
                  <span>Alanlar</span>
                  <div className="export-fields-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={selectDefaults}
                      disabled={submitting}
                    >
                      Varsayılanlar
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={selectAll}
                      disabled={submitting}
                    >
                      Tümünü Seç
                    </button>
                  </div>
                </div>

                <div className="export-fields-grid">
                  {config.fields.map((field) => (
                    <label key={field.value} className="export-checkbox-row">
                      <input
                        type="checkbox"
                        checked={form.selectedFields.includes(field.value)}
                        onChange={() => handleToggleField(field.value)}
                        disabled={submitting}
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="export-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Gönderiliyor..." : "Export Başlat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
