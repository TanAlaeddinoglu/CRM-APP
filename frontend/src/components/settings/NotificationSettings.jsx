import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import ConfirmModal from "../common/ConfirmModal.jsx";
import InfoTooltip from "../common/InfoTooltip.jsx";
import NotificationRuleModal from "./NotificationRuleModal.jsx";
import {
  createNotificationRule,
  deleteNotificationRule,
  getNotificationError,
  getNotificationRules,
  getNotificationTypes,
  updateNotificationRule,
} from "../../services/notifications.js";
import {
  createReminderRule,
  deleteReminderRule,
  getReminderConditionFields,
  getReminderError,
  getReminderRules,
  updateReminderRule,
} from "../../services/reminders.js";
import { getEmailConfiguration } from "../../services/emailSettings.js";

const CHANNELS = [
  {
    code: "in_app",
    label: "Uygulama İçi Bildirimler",
    description: "Randevu ve etkinlik bildirimleri anlık gösteriliyor.",
  },
  {
    code: "email",
    label: "E-posta Bildirimleri",
    description: "Randevu ve müşteri hareketleri için e-posta gönderimi.",
  },
];

const REMINDER_TYPE_KEY = "reminders.appointment_reminder";
const CHANNEL_SCOPE_OPTIONS = [
  { value: "in_app", label: "Uygulama İçi" },
  { value: "email", label: "E-posta" },
  { value: "both", label: "İkisi de" },
];

export default function NotificationSettings() {
  const [types, setTypes] = useState([]);
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChannelCode, setActiveChannelCode] = useState("in_app");
  const [togglingRuleId, setTogglingRuleId] = useState(null);
  const [togglingChannel, setTogglingChannel] = useState(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRule, setDeletingRule] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mailConfigured, setMailConfigured] = useState(true);
  // Zamanlayıcı (hatırlatma) kuralları
  const [reminderRules, setReminderRules] = useState([]);
  const [conditionFields, setConditionFields] = useState([]);
  const [editingReminder, setEditingReminder] = useState(null);
  const [defaultReminderNotifRule, setDefaultReminderNotifRule] = useState(null);
  const [deletingReminder, setDeletingReminder] = useState(null);
  // Onay modalları — kanal ve kural durumu değişikliği
  const [pendingChannelToggle, setPendingChannelToggle] = useState(null);
  const [pendingRuleToggle, setPendingRuleToggle] = useState(null);

  const emailBlocked = activeChannelCode === "email" && !mailConfigured;
  const getRuleChannels = (rule) => rule.channels ?? [];
  const isRuleOpenOnChannel = (rule, channelCode) =>
    Boolean(rule.is_active) && getRuleChannels(rule).includes(channelCode);
  const applyChannelScope = (channels, scope, enable) => {
    const current = Array.isArray(channels) ? channels : [];
    if (scope === "both") {
      return enable ? ["in_app", "email"] : [];
    }
    if (enable) {
      return current.includes(scope) ? current : [...current, scope];
    }
    return current.filter((channel) => channel !== scope);
  };

  const descriptionByType = useMemo(() => {
    const map = {};
    for (const t of types) map[t.key] = t.description || "";
    return map;
  }, [types]);

  // category="reminder" olan tiplerin type_key seti
  const reminderTypeKeys = useMemo(
    () => new Set(types.filter((t) => t.category === "reminder").map((t) => t.key)),
    [types]
  );

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      getNotificationTypes(),
      getNotificationRules(),
      getReminderRules(),
    ])
      .then(([typesRes, rulesRes, reminderRes]) => {
        setTypes(typesRes.data);
        setRules(rulesRes.data);
        setReminderRules(reminderRes.data);
      })
      .catch(() => toast.error(getNotificationError("load")))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
    getReminderConditionFields()
      .then((res) => setConditionFields(res.data))
      .catch(() => setConditionFields([]));
    getEmailConfiguration()
      .then((res) => setMailConfigured(Boolean(res.data?.configuration)))
      .catch(() => setMailConfigured(false));
  }, []);

  const activeChannel = useMemo(
    () => CHANNELS.find((c) => c.code === activeChannelCode),
    [activeChannelCode]
  );

  // Hatırlatma tipine ait NotificationRule'lar — normal sütunlarda gösterilmez;
  // zamanlayıcı gruplamasında şablon başlığı olarak kullanılır.
  const reminderNotifRules = useMemo(
    () => rules.filter((r) => reminderTypeKeys.has(r.type_key)),
    [rules, reminderTypeKeys]
  );

  // Normal bildirim kuralları — hatırlatma tiplerini içermez.
  const normalRules = useMemo(
    () => rules.filter((r) => !reminderTypeKeys.has(r.type_key)),
    [rules, reminderTypeKeys]
  );

  const systemRules = useMemo(
    () => normalRules.filter((r) => r.is_system_default),
    [normalRules]
  );
  const customRules = useMemo(
    () => normalRules.filter((r) => !r.is_system_default),
    [normalRules]
  );

  const handleChannelStatus = (code, open) => {
    setActiveChannelCode(code);
    const channelObj = CHANNELS.find((c) => c.code === code);
    const count = normalRules.length + reminderRules.length;
    setPendingChannelToggle({ code, open, label: channelObj?.label ?? code, count });
  };

  const confirmChannelToggle = () => {
    if (!pendingChannelToggle) return;
    const { code, open } = pendingChannelToggle;
    setPendingChannelToggle(null);

    const updates = [
      ...normalRules.map((r) => {
        const nextChannels = applyChannelScope(r.channels, code, open);
        return updateNotificationRule(r.id, {
          channels: nextChannels,
          is_active: nextChannels.length > 0,
        });
      }),
      ...reminderRules.map((r) => {
        const nextChannels = applyChannelScope(r.channels, code, open);
        return updateReminderRule(r.id, {
          channels: nextChannels,
          is_active: nextChannels.length > 0,
        });
      }),
    ];

    if (updates.length === 0) return;

    setTogglingChannel(code);
    Promise.all(updates)
      .then(() => {
        setRules((prev) =>
          prev.map((r) => {
            const nextChannels = applyChannelScope(r.channels, code, open);
            return { ...r, channels: nextChannels, is_active: nextChannels.length > 0 };
          })
        );
        setReminderRules((prev) =>
          prev.map((r) => {
            const nextChannels = applyChannelScope(r.channels, code, open);
            return { ...r, channels: nextChannels, is_active: nextChannels.length > 0 };
          })
        );
      })
      .catch(() => {
        toast.error("Kanal durumu güncellenirken hata oluştu.");
      })
      .finally(() => setTogglingChannel(null));
  };

  const MAIL_CONFIG_WARNING =
    "E-posta bildirimleri için önce mail (SMTP) konfigürasyonu kurun.";

  const handleRuleToggle = (rule) => {
    const currentOpen = isRuleOpenOnChannel(rule, activeChannelCode);
    if (!currentOpen && activeChannelCode === "email" && !mailConfigured) {
      toast.error(MAIL_CONFIG_WARNING);
      return;
    }
    if (!currentOpen) {
      const nextChannels = Array.from(new Set([...getRuleChannels(rule), activeChannelCode]));
      setTogglingRuleId(rule.id);
      updateNotificationRule(rule.id, { channels: nextChannels, is_active: true })
        .then(() =>
          setRules((prev) =>
            prev.map((r) => (r.id === rule.id ? { ...r, channels: nextChannels, is_active: true } : r))
          )
        )
        .catch(() => toast.error(getNotificationError("update")))
        .finally(() => setTogglingRuleId(null));
      return;
    }
    setPendingRuleToggle({ rule, kind: "normal", scope: activeChannelCode });
  };

  const openCreateModal = () => {
    if (emailBlocked) {
      toast.error(MAIL_CONFIG_WARNING);
      return;
    }
    setEditingRule(null);
    setEditingReminder(null);
    setRuleModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setEditingReminder(null);
    setRuleModalOpen(true);
  };

  const openEditReminder = (rule) => {
    setEditingReminder(rule);
    setEditingRule(null);
    setRuleModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setRuleModalOpen(false);
    setEditingRule(null);
    setEditingReminder(null);
    setDefaultReminderNotifRule(null);
  };

  // Zamanlayıcı kaydetme: NotificationRule oluştur/güncelle → ReminderRule oluştur/güncelle.
  const handleSaveReminder = ({
    type_key,
    notification_rule_id,
    notification_rule_name,
    title_template,
    body_template,
    ...reminderData
  }) => {
    setIsSaving(true);
    const isEditing = Boolean(editingReminder);

    const notifRulePayload = {
      name: notification_rule_name,
      title_template: title_template || null,
      body_template: body_template || null,
    };

    // Bir tür için tek şablon (NotificationRule): ya gelen ID'yi kullan ya da
    // aynı type_key'e sahip mevcutu bul; hiç yoksa yeni oluştur.
    const resolvedNotifRuleId =
      notification_rule_id ?? reminderNotifRules.find((r) => r.type_key === type_key)?.id ?? null;

    const notifRulePromise =
      resolvedNotifRuleId !== null
        ? // Mevcut şablonu güncelle
          updateNotificationRule(resolvedNotifRuleId, notifRulePayload).then(
            (res) => res.data.id
          )
        : // Yeni şablon oluştur (bu tür için ilk kez)
          createNotificationRule({
            type_key: type_key || REMINDER_TYPE_KEY,
            channels: ["in_app"],
            is_active: true,
            ...notifRulePayload,
          }).then((res) => res.data.id);

    notifRulePromise
      .then((finalNotifRuleId) => {
        const reminderPayload = { ...reminderData, notification_rule_id: finalNotifRuleId };
        return isEditing
          ? updateReminderRule(editingReminder.id, reminderPayload)
          : createReminderRule(reminderPayload);
      })
      .then(() => {
        toast.success(
          isEditing ? "Hatırlatma kuralı güncellendi." : "Hatırlatma kuralı oluşturuldu."
        );
        setRuleModalOpen(false);
        setEditingReminder(null);
        setDefaultReminderNotifRule(null);
        loadData();
      })
      .catch(() => toast.error(getReminderError(isEditing ? "update" : "create")))
      .finally(() => setIsSaving(false));
  };

  const handleReminderToggle = (rule) => {
    const currentOpen = isRuleOpenOnChannel(rule, activeChannelCode);
    if (!currentOpen && activeChannelCode === "email" && !mailConfigured) {
      toast.error(MAIL_CONFIG_WARNING);
      return;
    }
    if (!currentOpen) {
      const nextChannels = Array.from(new Set([...getRuleChannels(rule), activeChannelCode]));
      setTogglingRuleId(`r-${rule.id}`);
      updateReminderRule(rule.id, { channels: nextChannels, is_active: true })
        .then(() =>
          setReminderRules((prev) =>
            prev.map((r) => (r.id === rule.id ? { ...r, channels: nextChannels, is_active: true } : r))
          )
        )
        .catch(() => toast.error(getReminderError("update")))
        .finally(() => setTogglingRuleId(null));
      return;
    }
    setPendingRuleToggle({ rule, kind: "reminder", scope: activeChannelCode });
  };

  const confirmRuleToggle = () => {
    if (!pendingRuleToggle) return;
    const { rule, kind, scope } = pendingRuleToggle;
    setPendingRuleToggle(null);
    const nextChannels = applyChannelScope(getRuleChannels(rule), scope, false);
    const payload = {
      channels: nextChannels,
      is_active: nextChannels.length > 0,
    };

    if (kind === "normal") {
      setTogglingRuleId(rule.id);
      updateNotificationRule(rule.id, payload)
        .then(() =>
          setRules((prev) =>
            prev.map((r) => (r.id === rule.id ? { ...r, ...payload } : r))
          )
        )
        .catch(() => toast.error(getNotificationError("update")))
        .finally(() => setTogglingRuleId(null));
    } else {
      setTogglingRuleId(`r-${rule.id}`);
      updateReminderRule(rule.id, payload)
        .then(() =>
          setReminderRules((prev) =>
            prev.map((r) => (r.id === rule.id ? { ...r, ...payload } : r))
          )
        )
        .catch(() => toast.error(getReminderError("update")))
        .finally(() => setTogglingRuleId(null));
    }
  };

  const handleDeleteReminderConfirm = () => {
    if (!deletingReminder) return;
    setIsDeleting(true);
    deleteReminderRule(deletingReminder.id)
      .then(() => {
        toast.success("Hatırlatma kuralı silindi.");
        setDeletingReminder(null);
        loadData();
      })
      .catch(() => toast.error(getReminderError("delete")))
      .finally(() => setIsDeleting(false));
  };

  const handleSave = (formData) => {
    setIsSaving(true);
    const isEditing = Boolean(editingRule);
    const apiCall = isEditing
      ? updateNotificationRule(editingRule.id, formData)
      : createNotificationRule(formData);

    apiCall
      .then(() => {
        toast.success(isEditing ? "Kural güncellendi." : "Kural oluşturuldu.");
        setRuleModalOpen(false);
        setEditingRule(null);
        loadData();
      })
      .catch(() => toast.error(getNotificationError(isEditing ? "update" : "create")))
      .finally(() => setIsSaving(false));
  };

  const handleDeleteConfirm = () => {
    if (!deletingRule) return;
    setIsDeleting(true);
    deleteNotificationRule(deletingRule.id)
      .then(() => {
        toast.success("Kural silindi.");
        setDeletingRule(null);
        loadData();
      })
      .catch(() => toast.error(getNotificationError("delete")))
      .finally(() => setIsDeleting(false));
  };

  const renderRuleRow = (rule) => {
    const isToggling = togglingRuleId === rule.id;
    const description = descriptionByType[rule.type_key];
    const isOpen = isRuleOpenOnChannel(rule, activeChannelCode);
    return (
      <div key={rule.id} className="settings-rule-wrap">
        <div className="settings-rule-row">
          <div className="settings-rule-name-group">
            <strong>{rule.name}</strong>
            {rule.is_system_default && description && (
              <InfoTooltip text={description} />
            )}
            <button
              type="button"
              className="settings-rule-action-btn edit"
              aria-label="Düzenle"
              title="Düzenle"
              onClick={() => openEditModal(rule)}
            >
              <Pencil size={13} strokeWidth={2.2} />
            </button>
            {!rule.is_system_default && (
              <button
                type="button"
                className="settings-rule-action-btn delete"
                aria-label="Sil"
                title="Sil"
                onClick={() => setDeletingRule(rule)}
              >
                <Trash2 size={13} strokeWidth={2.2} />
              </button>
            )}
          </div>

          <div className="settings-toggle-group">
            <button
              type="button"
              className={`settings-toggle-option ${isOpen ? "active" : ""}`}
              onClick={() => !isToggling && handleRuleToggle(rule)}
              disabled={isToggling}
            >
              Açık
            </button>
            <button
              type="button"
              className={`settings-toggle-option ${!isOpen ? "active" : ""}`}
              onClick={() => !isToggling && handleRuleToggle(rule)}
              disabled={isToggling}
            >
              Kapalı
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReminderRow = (rule) => {
    const isToggling = togglingRuleId === `r-${rule.id}`;
    const isOpen = isRuleOpenOnChannel(rule, activeChannelCode);
    const summary = `${rule.conditions?.length ?? 0} koşul · ${
      rule.offsets?.length ?? 0
    } hatırlatma`;
    return (
      <div key={rule.id} className="settings-rule-wrap rrm-reminder-row">
        <div className="settings-rule-row">
          <div className="settings-rule-name-group">
            <strong>{rule.name}</strong>
            <span className="settings-rule-subtitle">{summary}</span>
            <button
              type="button"
              className="settings-rule-action-btn edit"
              aria-label="Düzenle"
              title="Düzenle"
              onClick={() => openEditReminder(rule)}
            >
              <Pencil size={13} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="settings-rule-action-btn delete"
              aria-label="Sil"
              title="Sil"
              onClick={() => setDeletingReminder(rule)}
            >
              <Trash2 size={13} strokeWidth={2.2} />
            </button>
          </div>

          <div className="settings-toggle-group">
            <button
              type="button"
              className={`settings-toggle-option ${isOpen ? "active" : ""}`}
              onClick={() => !isToggling && handleReminderToggle(rule)}
              disabled={isToggling}
            >
              Açık
            </button>
            <button
              type="button"
              className={`settings-toggle-option ${!isOpen ? "active" : ""}`}
              onClick={() => !isToggling && handleReminderToggle(rule)}
              disabled={isToggling}
            >
              Kapalı
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Zamanlayıcı bölümü: her NotificationRule bir grup başlığı, altında bağlı ReminderRule'lar.
  const renderTimerSection = () => {
    if (reminderNotifRules.length === 0 && reminderRules.length === 0) return null;

    return (
      <>
        <div className="settings-rule-group-header">
          Zamanlayıcı (Hatırlatma) Kuralları
        </div>
        {reminderNotifRules.map((notifRule) => {
          const linked = reminderRules.filter(
            (r) => r.notification_rule?.id === notifRule.id
          );
          return (
            <div key={notifRule.id} className="rrm-notif-rule-group">
              <div className="rrm-notif-rule-header">
                <span className="rrm-notif-rule-name">{notifRule.name}</span>
                <button
                  type="button"
                  className="rrm-notif-rule-add-btn"
                  title="Bu şablona yeni zamanlayıcı ekle"
                  onClick={() => {
                    setEditingRule(null);
                    setEditingReminder(null);
                    setDefaultReminderNotifRule(notifRule);
                    setRuleModalOpen(true);
                  }}
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>
              {linked.length === 0 ? (
                <div className="rrm-notif-rule-empty">Henüz zamanlayıcı eklenmedi.</div>
              ) : (
                <div className="rrm-reminder-list">
                  {linked.map(renderReminderRow)}
                </div>
              )}
            </div>
          );
        })}
        {/* Bağlantısız reminder kuralları (notification_rule = null) */}
        {reminderRules
          .filter((r) => !r.notification_rule)
          .map(renderReminderRow)}
      </>
    );
  };

  const hasContent =
    normalRules.length > 0 || reminderNotifRules.length > 0 || reminderRules.length > 0;

  return (
    <>
      <div className="settings-panel-grid">
        {/* Sol kart — kanal listesi */}
        <article className="settings-card">
          <div className="settings-card-header">
            <h2>Bildirim Kanalları</h2>
            <span>{CHANNELS.length} kanal</span>
          </div>

          <div className="settings-field-list">
            {CHANNELS.map((channel) => {
              const isOpen =
                normalRules.some((r) => getRuleChannels(r).includes(channel.code)) ||
                reminderRules.some((r) => getRuleChannels(r).includes(channel.code));
              return (
                <div
                  key={channel.code}
                  className={`settings-select-row ${activeChannelCode === channel.code ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="settings-select-main"
                    onClick={() => setActiveChannelCode(channel.code)}
                  >
                    <div>
                      <strong>{channel.label}</strong>
                      <p>{channel.description}</p>
                    </div>
                  </button>

                  <div className="settings-toggle-group">
                    <button
                      type="button"
                      className={`settings-toggle-option ${isOpen ? "active" : ""}`}
                      onClick={() => handleChannelStatus(channel.code, true)}
                      disabled={togglingChannel === channel.code}
                    >
                      Açık
                    </button>
                    <button
                      type="button"
                      className={`settings-toggle-option ${!isOpen ? "active" : ""}`}
                      onClick={() => handleChannelStatus(channel.code, false)}
                      disabled={togglingChannel === channel.code}
                    >
                      Kapalı
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Sağ kart — seçili kanalın kuralları + zamanlayıcı grubu */}
        <article className="settings-card">
          <div className="settings-card-header">
            <h2>{activeChannel?.label ?? "Bildirim Kuralları"}</h2>
            <button
              type="button"
              className="settings-icon-button settings-icon-button-primary"
              aria-label="Kural oluştur"
              title={emailBlocked ? MAIL_CONFIG_WARNING : "Kural oluştur"}
              onClick={openCreateModal}
              disabled={isLoading || emailBlocked}
            >
              <Plus size={18} strokeWidth={2.2} />
            </button>
          </div>

          {emailBlocked && (
            <div className="settings-inline-warning">
              <AlertTriangle size={16} strokeWidth={2.2} />
              <span>
                E-posta bildirimleri için önce <strong>mail (SMTP)
                konfigürasyonu</strong> kurun. Konfigürasyonu "Entegrasyonlar"
                bölümünden ekleyebilirsiniz.
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="settings-empty-state">
              <p>Yükleniyor…</p>
            </div>
          ) : !hasContent ? (
            <div className="settings-empty-state">
              <strong>Henüz kural oluşturulmamış.</strong>
              <p>
                <button
                  type="button"
                  className="settings-action-button"
                  onClick={openCreateModal}
                  style={{ marginTop: 8 }}
                >
                  <Plus size={14} /> Kural oluştur
                </button>
              </p>
            </div>
          ) : (
            <div className="settings-note-list settings-note-list-scroll">
              {systemRules.length > 0 && (
                <>
                  <div className="settings-rule-group-header">
                    Sistem Varsayılan Bildirimler
                  </div>
                  {systemRules.map(renderRuleRow)}
                </>
              )}

              {customRules.length > 0 && (
                <>
                  <div className="settings-rule-group-header">Özel</div>
                  {customRules.map(renderRuleRow)}
                </>
              )}

              {renderTimerSection()}
            </div>
          )}
        </article>
      </div>

      <NotificationRuleModal
        open={ruleModalOpen}
        types={types}
        editingRule={editingRule}
        editingReminder={editingReminder}
        defaultReminderNotifRule={defaultReminderNotifRule}
        conditionFields={conditionFields}
        activeChannelCode={activeChannelCode}
        reminderNotifRules={reminderNotifRules}
        onSave={handleSave}
        onSaveReminder={handleSaveReminder}
        onClose={closeModal}
        isSaving={isSaving}
      />

      <ConfirmModal
        open={Boolean(deletingRule)}
        title="Kuralı Sil"
        description={`"${deletingRule?.name}" kuralı kalıcı olarak silinecek. Onaylıyor musun?`}
        confirmText={isDeleting ? "Siliniyor…" : "Evet, Sil"}
        cancelText="Vazgeç"
        onCancel={() => {
          if (isDeleting) return;
          setDeletingRule(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmModal
        open={Boolean(deletingReminder)}
        title="Hatırlatma Kuralını Sil"
        description={`"${deletingReminder?.name}" hatırlatma kuralı kalıcı olarak silinecek. Onaylıyor musun?`}
        confirmText={isDeleting ? "Siliniyor…" : "Evet, Sil"}
        cancelText="Vazgeç"
        onCancel={() => {
          if (isDeleting) return;
          setDeletingReminder(null);
        }}
        onConfirm={handleDeleteReminderConfirm}
      />

      {/* Kanal durumu değiştirme onayı */}
      <ConfirmModal
        open={Boolean(pendingChannelToggle)}
        title={pendingChannelToggle?.open ? "Kanalı Aç" : "Kanalı Kapat"}
        description={
          pendingChannelToggle?.open
            ? `"${pendingChannelToggle?.label}" kanalını açmak üzeresiniz.${
                pendingChannelToggle?.count > 0
                  ? ` ${pendingChannelToggle?.count} kuralda bu kanal açılacak.`
                  : ""
              } Onaylıyor musun?`
            : `"${pendingChannelToggle?.label}" kanalını kapatmak üzeresiniz.${
                pendingChannelToggle?.count > 0
                  ? ` ${pendingChannelToggle?.count} kuralda bu kanal kapatılacak.`
                  : ""
              } Onaylıyor musun?`
        }
        confirmText={pendingChannelToggle?.open ? "Evet, Aç" : "Evet, Kapat"}
        cancelText="Vazgeç"
        onCancel={() => setPendingChannelToggle(null)}
        onConfirm={confirmChannelToggle}
      />

      {/* Kural aktif/pasif değiştirme onayı */}
      <ConfirmModal
        open={Boolean(pendingRuleToggle)}
        title="Kanalı Kapat"
        description={`"${pendingRuleToggle?.rule?.name}" bildirimi için hangi kanalları kapatmak istiyorsunuz?`}
        confirmText="Kapat"
        cancelText="Vazgeç"
        onCancel={() => setPendingRuleToggle(null)}
        onConfirm={confirmRuleToggle}
      >
        <div className="settings-checkbox-group">
          {CHANNEL_SCOPE_OPTIONS.map((option) => (
            <label key={option.value} className="settings-checkbox-row">
              <input
                type="radio"
                name="channel-scope"
                checked={(pendingRuleToggle?.scope ?? activeChannelCode) === option.value}
                onChange={() =>
                  setPendingRuleToggle((prev) => (prev ? { ...prev, scope: option.value } : prev))
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </ConfirmModal>
    </>
  );
}
