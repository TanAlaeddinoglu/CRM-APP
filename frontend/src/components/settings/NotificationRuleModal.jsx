import { useEffect, useMemo, useState } from "react";

const INITIAL_FORM = {
  type_key: "",
  name: "",
  title_template: "",
  body_template: "",
  is_active: true,
};

const CHANNEL_LABELS = {
  in_app: "Uygulama İçi",
  email: "E-posta",
};

export default function NotificationRuleModal({
  open,
  types,
  editingRule,
  activeChannelCode,
  onSave,
  onClose,
  isSaving,
}) {
  const [form, setForm] = useState(INITIAL_FORM);

  const isEditing = Boolean(editingRule);
  const isSystemDefault = editingRule?.is_system_default ?? false;

  // Editing iken hangi kanallar var
  const ruleChannels = isEditing ? (editingRule.channels ?? []) : [activeChannelCode];
  const channelLabel = CHANNEL_LABELS[activeChannelCode] ?? activeChannelCode;

  useEffect(() => {
    if (!open) return;
    if (editingRule) {
      setForm({
        type_key: editingRule.type_key,
        name: editingRule.name,
        title_template: editingRule.title_template || "",
        body_template: editingRule.body_template || "",
        is_active: editingRule.is_active,
      });
    } else {
      setForm({ ...INITIAL_FORM, type_key: types[0]?.key || "" });
    }
  }, [open, editingRule, types]);

  const selectedType = useMemo(
    () => types.find((t) => t.key === form.type_key),
    [types, form.type_key]
  );

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleIsActiveChange = (e) => {
    setForm((prev) => ({ ...prev, is_active: e.target.value === "true" }));
  };

  const handleSubmit = () => {
    if (!isSystemDefault && !form.name.trim()) return;
    onSave({
      type_key: form.type_key,
      name: form.name.trim(),
      channels: ruleChannels,
      title_template: form.title_template.trim() || null,
      body_template: form.body_template.trim() || null,
      is_active: form.is_active,
    });
  };

  const title = isEditing ? "Kuralı Düzenle" : "Kural Oluştur";
  const saveLabel = isSaving ? "Kaydediliyor…" : isEditing ? "Güncelle" : "Oluştur";

  return (
    <div className="modal-overlay">
      <div className="modal-box nrm-box">
        <div className="nrm-header">
          <h2 className="nrm-title">{title}</h2>
          <button type="button" className="nrm-close-btn" onClick={onClose} disabled={isSaving}>✕</button>
        </div>

        <div className="nrm-body">
          {/* Kanal bilgisi */}
          <div className="nrm-channel-tag">
            <span className={`nrm-channel-chip ${isEditing ? (ruleChannels.includes("email") ? "email" : "in-app") : (activeChannelCode === "email" ? "email" : "in-app")}`}>
              {isEditing
                ? ruleChannels.map((c) => CHANNEL_LABELS[c] ?? c).join(" + ")
                : channelLabel}
            </span>
            <span className="nrm-channel-info">
              {isEditing ? "kanalı için kural düzenleniyor" : "kanalı için kural oluşturuyorsunuz"}
            </span>
          </div>

          {isSystemDefault && (
            <p className="nrm-system-note">
              Varsayılan sistem kuralı — sadece şablon ve durum düzenlenebilir.
            </p>
          )}

          {/* Bildirim tipi */}
          <div className="nrm-row">
            <label className="nrm-label">Bildirim tipi</label>
            <select
              name="type_key"
              value={form.type_key}
              onChange={handleChange}
              className="nrm-input"
              disabled={isEditing || isSaving}
            >
              {types.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Kural adı */}
          <div className="nrm-row">
            <label className="nrm-label">Kural adı</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Örn: Randevu oluşturulduğunda bildir"
              className="nrm-input"
              disabled={isSystemDefault || isSaving}
            />
          </div>

          {/* Şablonlar */}
          <div className="nrm-row">
            <label className="nrm-label">
              Başlık şablonu
              <span className="nrm-optional">isteğe bağlı</span>
            </label>
            <input
              name="title_template"
              value={form.title_template}
              onChange={handleChange}
              placeholder={selectedType?.default_title_template || "Varsayılan başlık kullanılır"}
              className="nrm-input"
              disabled={isSystemDefault || isSaving}
            />
          </div>

          <div className="nrm-row">
            <label className="nrm-label">
              İçerik şablonu
              <span className="nrm-optional">isteğe bağlı</span>
            </label>
            <textarea
              name="body_template"
              value={form.body_template}
              onChange={handleChange}
              rows={2}
              placeholder={selectedType?.default_body_template || "Varsayılan içerik kullanılır"}
              className="nrm-input nrm-textarea"
              disabled={isSystemDefault || isSaving}
            />
          </div>

          {/* Durum */}
          <div className="nrm-row">
            <label className="nrm-label">Durum</label>
            <select
              value={String(form.is_active)}
              onChange={handleIsActiveChange}
              className="nrm-input"
              disabled={isSaving}
            >
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>
        </div>

        <div className="nrm-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
            İptal
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isSaving}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
