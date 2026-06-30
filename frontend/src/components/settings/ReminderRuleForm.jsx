import { useRef } from "react";
import { FileText, Sliders } from "lucide-react";
import InfoTooltip from "../common/InfoTooltip.jsx";
import ChannelSelectionField from "./ChannelSelectionField.jsx";
import TemplateField from "./TemplateField.jsx";
import StatusToggle from "./StatusToggle.jsx";
import TokenButtonRow from "./TokenButtonRow.jsx";
import ConditionsSection from "./ConditionsSection.jsx";
import OffsetSection from "./OffsetSection.jsx";
import { humanizeTemplate } from "../../utils/templateTokens.js";

export const EMPTY_REMINDER_FORM = {
  type_key: "",
  notification_rule_id: null,
  notification_rule_name: "",
  name: "",
  is_active: true,
  channels: ["in_app"],
  notify_assigned_user: true,
  notify_admins: false,
  conditions: [],
  offsets: [{ amount: 1, unit: "days", direction: "before" }],
  title_template: "",
  body_template: "",
};

export default function ReminderRuleForm({
  form,
  setForm,
  conditionFields,
  disabled,
  reminderTypes = [],
  reminderNotifRules = [],
}) {
  const titleFieldRef = useRef(null);
  const bodyFieldRef = useRef(null);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const selectedReminderType =
    reminderTypes.find((t) => t.key === form.type_key) ?? reminderTypes[0];
  const variables = selectedReminderType?.variables ?? [];

  const handleTypeChange = (typeKey) => {
    const type = reminderTypes.find((t) => t.key === typeKey);
    const existing = reminderNotifRules.find((r) => r.type_key === typeKey);
    update({
      type_key: typeKey,
      notification_rule_id: existing?.id ?? null,
      notification_rule_name: existing?.name ?? (type?.label ?? ""),
      title_template: existing?.title_template ?? (type?.default_title_template ?? ""),
      body_template: existing?.body_template ?? (type?.default_body_template ?? ""),
    });
  };

  const typeDisabled = disabled || form.notification_rule_id !== null;

  return (
    <div className="rrm-form-rows">
      {/* Satır 1: Kural Ayarları + Şablon */}
      <div className="rrm-two-col">
        {/* Kural Ayarları */}
        <div className="rrm-section">
          <div className="rrm-section-title">
            <Sliders size={12} strokeWidth={2.5} />
            <span>Kural Ayarları</span>
          </div>

          <div className="nrm-row">
            <label className="nrm-label">
              Bildirim türü
              <span className="nrm-required">zorunlu</span>
            </label>
            <select
              className="nrm-input"
              value={form.type_key}
              onChange={(e) => handleTypeChange(e.target.value)}
              disabled={typeDisabled}
            >
              {reminderTypes.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="nrm-row">
            <label className="nrm-label">
              Kural adı
              <span className="nrm-required">zorunlu</span>
            </label>
            <input
              className="nrm-input"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Örn: Randevudan 1 gün önce hatırlat"
              disabled={disabled}
            />
          </div>

          <div className="rrm-status-row">
            <span className="nrm-label">Durum</span>
            <StatusToggle
              value={form.is_active}
              onChange={(v) => update({ is_active: v })}
              disabled={disabled}
            />
          </div>

          <div className="nrm-row">
            <label className="nrm-label">Alıcılar</label>
            <div className="rrm-chip-group">
              <button
                type="button"
                aria-label="Atanmış kullanıcıya gönder"
                className={`rrm-chip ${form.notify_assigned_user ? "active" : ""}`}
                onClick={() => update({ notify_assigned_user: !form.notify_assigned_user })}
                disabled={disabled}
              >
                Atanmış kullanıcı
              </button>
              <button
                type="button"
                aria-label="Aktif adminlere gönder"
                className={`rrm-chip ${form.notify_admins ? "active" : ""}`}
                onClick={() => update({ notify_admins: !form.notify_admins })}
                disabled={disabled}
              >
                Aktif adminler
              </button>
            </div>
          </div>

          <div className="nrm-row">
            <label className="nrm-label">Kanallar</label>
            <ChannelSelectionField
              value={form.channels}
              onChange={(channels) => update({ channels })}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Şablon */}
        <div className="rrm-section">
          <div className="rrm-section-title">
            <FileText size={12} strokeWidth={2.5} />
            <span>Şablon</span>
            <InfoTooltip text="Hatırlatma bildiriminin başlık ve içerik şablonu. {değişken} sözdizimi ile dinamik içerik eklenebilir. Bu şablon aynı bildirim şablonunu kullanan tüm zamanlayıcıları etkiler." />
          </div>

          <div className="nrm-row">
            <label className="nrm-label">
              Başlık şablonu
              <span className="nrm-required">zorunlu</span>
            </label>
            <TemplateField
              key={`title-${form.type_key}-${form.notification_rule_id ?? "new"}`}
              ref={titleFieldRef}
              value={form.title_template}
              variables={variables}
              onChange={(v) => update({ title_template: v })}
              placeholder={
                humanizeTemplate(selectedReminderType?.default_title_template, variables) ||
                "Başlık şablonu girin"
              }
              disabled={disabled}
            />
            <TokenButtonRow variables={variables} fieldRef={titleFieldRef} disabled={disabled} />
          </div>

          <div className="nrm-row">
            <label className="nrm-label">
              İçerik şablonu
              <span className="nrm-optional">isteğe bağlı</span>
              <InfoTooltip text="Boş bırakılırsa bildirim tipinin varsayılan içeriği otomatik atanır." />
            </label>
            <TemplateField
              key={`body-${form.type_key}-${form.notification_rule_id ?? "new"}`}
              ref={bodyFieldRef}
              value={form.body_template}
              variables={variables}
              multiline
              onChange={(v) => update({ body_template: v })}
              placeholder={
                humanizeTemplate(selectedReminderType?.default_body_template, variables) ||
                "Boş bırakılırsa varsayılan içerik kullanılır"
              }
              disabled={disabled}
            />
            <TokenButtonRow variables={variables} fieldRef={bodyFieldRef} disabled={disabled} />
          </div>
        </div>
      </div>

      {/* Satır 2: Koşullar + Hatırlatma zamanları */}
      <div className="rrm-two-col">
        <ConditionsSection
          conditions={form.conditions}
          conditionFields={conditionFields}
          onChange={(conditions) => update({ conditions })}
          disabled={disabled}
        />
        <OffsetSection
          offsets={form.offsets}
          onChange={(offsets) => update({ offsets })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
