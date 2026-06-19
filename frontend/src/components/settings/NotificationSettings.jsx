import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import ConfirmModal from "../common/ConfirmModal.jsx";
import NotificationRuleModal from "./NotificationRuleModal.jsx";
import {
  createNotificationRule,
  deleteNotificationRule,
  getNotificationError,
  getNotificationRules,
  getNotificationTypes,
  updateNotificationRule,
} from "../../services/notifications.js";

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

export default function NotificationSettings() {
  const [types, setTypes] = useState([]);
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChannelCode, setActiveChannelCode] = useState("in_app");
  const [channelOpen, setChannelOpen] = useState({ in_app: true, email: true });
  const [togglingRuleId, setTogglingRuleId] = useState(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRule, setDeletingRule] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = (keepChannel) => {
    setIsLoading(true);
    Promise.all([getNotificationTypes(), getNotificationRules()])
      .then(([typesRes, rulesRes]) => {
        setTypes(typesRes.data);
        setRules(rulesRes.data);
      })
      .catch(() => toast.error(getNotificationError("load")))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeChannel = useMemo(
    () => CHANNELS.find((c) => c.code === activeChannelCode),
    [activeChannelCode]
  );

  const channelRules = useMemo(
    () => rules.filter((r) => r.channels.includes(activeChannelCode)),
    [rules, activeChannelCode]
  );

  const isChannelOpen = channelOpen[activeChannelCode];

  const handleChannelStatus = (code, open) => {
    setActiveChannelCode(code);
    setChannelOpen((prev) => ({ ...prev, [code]: open }));
  };

  const handleRuleToggle = (rule) => {
    setTogglingRuleId(rule.id);
    updateNotificationRule(rule.id, { is_active: !rule.is_active })
      .then(() => {
        setRules((prev) =>
          prev.map((r) =>
            r.id === rule.id ? { ...r, is_active: !r.is_active } : r
          )
        );
      })
      .catch(() => toast.error(getNotificationError("update")))
      .finally(() => setTogglingRuleId(null));
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setRuleModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setRuleModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setRuleModalOpen(false);
    setEditingRule(null);
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
              const isOpen = channelOpen[channel.code];
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
                    >
                      Açık
                    </button>
                    <button
                      type="button"
                      className={`settings-toggle-option ${!isOpen ? "active" : ""}`}
                      onClick={() => handleChannelStatus(channel.code, false)}
                    >
                      Kapalı
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Sağ kart — seçili kanalın kuralları */}
        <article className="settings-card">
          <div className="settings-card-header">
            <h2>{activeChannel?.label ?? "Bildirim Kuralları"}</h2>
            {isChannelOpen && (
              <button
                type="button"
                className="settings-icon-button settings-icon-button-primary"
                aria-label="Kural oluştur"
                title="Kural oluştur"
                onClick={openCreateModal}
                disabled={isLoading}
              >
                <Plus size={18} strokeWidth={2.2} />
              </button>
            )}
          </div>

          {!isChannelOpen ? (
            <div className="settings-empty-state">
              <strong>Bu kanal kapalı.</strong>
              <p>Bildirim ayarları gösterilmiyor.</p>
            </div>
          ) : isLoading ? (
            <div className="settings-empty-state">
              <p>Yükleniyor…</p>
            </div>
          ) : channelRules.length === 0 ? (
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
              {channelRules.map((rule) => {
                const isToggling = togglingRuleId === rule.id;
                return (
                  <div key={rule.id} className="settings-rule-row">
                    {/* Sol: ad + edit + delete */}
                    <div className="settings-rule-name-group">
                      <strong>{rule.name}</strong>
                      {!rule.is_system_default && (
                        <button
                          type="button"
                          className="settings-rule-action-btn edit"
                          aria-label="Düzenle"
                          title="Düzenle"
                          onClick={() => openEditModal(rule)}
                        >
                          <Pencil size={13} strokeWidth={2.2} />
                        </button>
                      )}
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

                    {/* Sağ: toggle */}
                    <div className="settings-toggle-group">
                      <button
                        type="button"
                        className={`settings-toggle-option ${rule.is_active ? "active" : ""}`}
                        onClick={() => !isToggling && handleRuleToggle(rule)}
                        disabled={isToggling}
                      >
                        Açık
                      </button>
                      <button
                        type="button"
                        className={`settings-toggle-option ${!rule.is_active ? "active" : ""}`}
                        onClick={() => !isToggling && handleRuleToggle(rule)}
                        disabled={isToggling}
                      >
                        Kapalı
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </div>

      <NotificationRuleModal
        open={ruleModalOpen}
        types={types}
        editingRule={editingRule}
        activeChannelCode={activeChannelCode}
        onSave={handleSave}
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
    </>
  );
}
