import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import NormalRuleForm from "./NormalRuleForm.jsx";
import ReminderRuleForm, { EMPTY_REMINDER_FORM } from "./ReminderRuleForm.jsx";

const INITIAL_FORM = {
  type_key: "",
  name: "",
  channels: [],
  title_template: "",
  body_template: "",
  is_active: true,
};

export default function NotificationRuleModal({
  open,
  types,
  editingRule,
  editingReminder,
  defaultReminderNotifRule = null,
  conditionFields = [],
  activeChannelCode,
  reminderNotifRules = [],
  onSave,
  onSaveReminder,
  onClose,
  isSaving,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [kind, setKind] = useState("normal");
  const [reminderForm, setReminderForm] = useState(EMPTY_REMINDER_FORM);

  const isEditing = Boolean(editingRule) || Boolean(editingReminder);
  const isSystemDefault = editingRule?.is_system_default ?? false;

  const generalTypes = useMemo(
    () => types.filter((t) => !t.category || t.category === "general"),
    [types]
  );
  const reminderTypes = useMemo(
    () => types.filter((t) => t.category === "reminder"),
    [types]
  );

  useEffect(() => {
    if (!open) return;
    if (editingReminder || defaultReminderNotifRule) {
      setKind("timer");
    } else {
      setKind("normal");
    }
  }, [open, editingRule, editingReminder, defaultReminderNotifRule]);

  useEffect(() => {
    if (!open) return;
    if (editingReminder) {
      const linkedRule = editingReminder.notification_rule;
      setReminderForm({
        type_key: linkedRule?.type_key ?? "",
        notification_rule_id: linkedRule?.id ?? null,
        notification_rule_name: linkedRule?.name ?? "",
        name: editingReminder.name,
        is_active: editingReminder.is_active,
        channels: editingReminder.channels ?? ["in_app"],
        notify_assigned_user: editingReminder.notify_assigned_user,
        notify_admins: editingReminder.notify_admins,
        conditions: (editingReminder.conditions ?? []).map((c) => ({ ...c })),
        offsets: (editingReminder.offsets ?? []).map((o) => ({ ...o })),
        title_template: linkedRule?.title_template ?? "",
        body_template: linkedRule?.body_template ?? "",
      });
    } else {
      const firstType = reminderTypes[0];
      const preset = defaultReminderNotifRule;
      const existingForFirstType = !preset
        ? reminderNotifRules.find((r) => r.type_key === firstType?.key) ?? null
        : null;
      const source = preset ?? existingForFirstType;
      setReminderForm({
        ...EMPTY_REMINDER_FORM,
        type_key: source?.type_key ?? (firstType?.key ?? ""),
        notification_rule_id: source?.id ?? null,
        notification_rule_name: source?.name ?? (firstType?.label ?? ""),
        title_template: source?.title_template ?? (firstType?.default_title_template ?? ""),
        body_template: source?.body_template ?? (firstType?.default_body_template ?? ""),
      });
    }
  }, [open, editingReminder, defaultReminderNotifRule, reminderNotifRules, reminderTypes]);

  useEffect(() => {
    if (!open) return;
    if (editingRule) {
      const editingType = types
        .filter((t) => !t.category || t.category === "general")
        .find((t) => t.key === editingRule.type_key);
      setForm({
        type_key: editingRule.type_key,
        name: editingRule.name,
        channels: editingRule.channels ?? [],
        title_template: editingRule.title_template || editingType?.default_title_template || "",
        body_template: editingRule.body_template || editingType?.default_body_template || "",
        is_active: editingRule.is_active,
      });
    } else {
      setForm({
        ...INITIAL_FORM,
        type_key: generalTypes[0]?.key || "",
        channels: activeChannelCode ? [activeChannelCode] : [],
      });
    }
  }, [open, editingRule, generalTypes, activeChannelCode]);

  const selectedType = useMemo(
    () => generalTypes.find((t) => t.key === form.type_key),
    [generalTypes, form.type_key]
  );

  const handleResetTemplates = () => {
    setForm((prev) => ({
      ...prev,
      title_template: selectedType?.default_title_template || "",
      body_template: selectedType?.default_body_template || "",
    }));
  };

  if (!open) return null;

  const submitTimer = () => {
    if (!reminderForm.type_key) {
      toast.error("Bildirim türü seçilmedi.");
      return;
    }
    if (!reminderForm.name.trim()) {
      toast.error("Kural adı zorunludur.");
      return;
    }
    if (!reminderForm.title_template.trim()) {
      toast.error("Başlık şablonu zorunludur.");
      return;
    }
    if (reminderForm.offsets.length === 0) {
      toast.error("En az bir hatırlatma zamanı ekleyin.");
      return;
    }
    if (reminderForm.offsets.some((o) => !o.amount || o.amount < 1)) {
      toast.error("Hatırlatma zamanları 1 veya daha büyük olmalı.");
      return;
    }
    if (reminderForm.channels.length === 0) {
      toast.error("En az bir kanal seçin.");
      return;
    }
    if (!reminderForm.notify_assigned_user && !reminderForm.notify_admins) {
      toast.error("En az bir alıcı hedefi seçin.");
      return;
    }
    onSaveReminder({
      type_key: reminderForm.type_key,
      notification_rule_id: reminderForm.notification_rule_id,
      notification_rule_name: reminderForm.notification_rule_name.trim(),
      title_template: reminderForm.title_template.trim(),
      body_template: reminderForm.body_template.trim(),
      name: reminderForm.name.trim(),
      is_active: reminderForm.channels.length > 0 ? reminderForm.is_active : false,
      channels: reminderForm.channels,
      notify_assigned_user: reminderForm.notify_assigned_user,
      notify_admins: reminderForm.notify_admins,
      conditions: reminderForm.conditions,
      offsets: reminderForm.offsets.map((o) => ({
        amount: Number(o.amount),
        unit: o.unit,
        direction: o.direction,
      })),
    });
  };

  const handleSubmit = () => {
    if (kind === "timer") {
      submitTimer();
      return;
    }
    if (!isSystemDefault && !form.name.trim()) {
      toast.error("Kural adı zorunludur.");
      return;
    }
    if (!isSystemDefault && !form.title_template.trim()) {
      toast.error("Başlık şablonu zorunludur.");
      return;
    }
    onSave({
      type_key: form.type_key,
      ...(isSystemDefault ? {} : { name: form.name.trim() }),
      channels: form.channels,
      title_template: form.title_template.trim() || null,
      body_template:
        form.body_template.trim() ||
        selectedType?.default_body_template ||
        null,
      is_active: form.channels.length > 0 ? form.is_active : false,
    });
  };

  const title = isEditing ? "Kuralı Düzenle" : "Kural Oluştur";
  const saveLabel = isSaving ? "Kaydediliyor…" : isEditing ? "Güncelle" : "Oluştur";

  return (
    <div className="modal-overlay">
      <div className="modal-box nrm-box nrm-box--wide">
        <div className="nrm-header">
          <h2 className="nrm-title">{title}</h2>
          <button type="button" className="nrm-close-btn" onClick={onClose} disabled={isSaving}>✕</button>
        </div>

        <div className="nrm-body">
          {!isEditing && !defaultReminderNotifRule && (
            <div className="nrm-row">
              <label className="nrm-label">Kural türü</label>
              <select
                className="nrm-input"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                disabled={isSaving}
              >
                <option value="normal">Normal Bildirim Kuralı</option>
                <option value="timer">Zamanlayıcı (Hatırlatma) Kuralı</option>
              </select>
            </div>
          )}

          {kind === "timer" ? (
            <div key="timer" className="nrm-content-anim">
              <ReminderRuleForm
                form={reminderForm}
                setForm={setReminderForm}
                conditionFields={conditionFields}
                disabled={isSaving}
                reminderTypes={reminderTypes}
                reminderNotifRules={reminderNotifRules}
              />
            </div>
          ) : (
            <div key="normal" className="nrm-content-anim">
              <NormalRuleForm
                form={form}
                setForm={setForm}
                types={generalTypes}
                isEditing={isEditing}
                isSystemDefault={isSystemDefault}
                isSaving={isSaving}
                onResetTemplates={handleResetTemplates}
              />
            </div>
          )}
        </div>

        <div className="nrm-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
            İptal
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
