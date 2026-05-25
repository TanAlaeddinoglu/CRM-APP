import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import NotificationRuleModal from "./NotificationRuleModal.jsx";

const INITIAL_RULE_FORM = {
  name: "",
  trigger: "event_created",
  audience: "admin_and_assigned",
  channel: "in_app_and_popup",
  schedule: "immediate",
  status: "active",
  description: "",
};

const CHANNELS = [
  {
    id: "email",
    title: "E-posta bildirimleri",
    description: "Randevu, ödeme ve müşteri hareketleri için açık.",
    settingsTitle: "E-posta bildirim ayarları",
    settings: [
      {
        label: "Gönderim sıklığı",
        value: "Anlık gönderim ve günlük özet birlikte çalışıyor.",
      },
      {
        label: "Alıcı grubu",
        value: "Yöneticiler ve ilgili operasyon kullanıcıları bilgilendiriliyor.",
      },
      {
        label: "Teslimat kuralı",
        value: "Başarısız gönderimlerde 10 dakika sonra otomatik tekrar deneniyor.",
      },
    ],
  },
  {
    id: "browser",
    title: "Tarayıcı bildirimleri",
    description: "Görev ve hatırlatma bildirimleri anlık gösteriliyor.",
    settingsTitle: "Bildirim gönderme kuralları",
    settings: [
      {
        label: "Event oluşturulduğunda bildirim gönder",
        value: "Alıcı: Admin ve atanmış kullanıcı · Kanal: Uygulama içi + popup",
        trigger: "event_created",
        audience: "admin_and_assigned",
        channel: "in_app_and_popup",
        schedule: "immediate",
        status: "active",
        description: "Yeni randevu oluştuğunda ilgili ekipleri anlık bilgilendirir.",
      },
      {
        label: "Randevuya 1 saat kala hatırlatma gönder",
        value: "Alıcı: Atanmış kullanıcı · Kanal: Uygulama içi + popup",
        trigger: "appointment_before_1h",
        audience: "assigned_user",
        channel: "in_app_and_popup",
        schedule: "one_hour_before",
        status: "active",
        description: "Yaklaşan randevular için önceden uyarı üretir.",
      },
      {
        label: "Yeni müşteri atandığında bildirim gönder",
        value: "Alıcı: İlgili kullanıcı ve admin · Kanal: Uygulama içi",
        trigger: "customer_assigned",
        audience: "admin_and_assigned",
        channel: "in_app",
        schedule: "immediate",
        status: "active",
        description: "Atama tamamlandığında ilgili kullanıcıyı haberdar eder.",
      },
      {
        label: "Ödeme tamamlandığında bildirim gönder",
        value: "Alıcı: Admin · Kanal: Uygulama içi",
        trigger: "payment_completed",
        audience: "admin_only",
        channel: "in_app",
        schedule: "immediate",
        status: "active",
        description: "Tahsilat tamamlanan kayıtları yönetime bildirir.",
      },
      {
        label: "Randevu yeniden planlandığında bildirim gönder",
        value: "Alıcı: Admin ve atanmış kullanıcı · Kanal: Uygulama içi + popup",
        trigger: "appointment_rescheduled",
        audience: "admin_and_assigned",
        channel: "in_app_and_popup",
        schedule: "immediate",
        status: "active",
        description: "Randevu saati değiştiğinde yeni planı iletir.",
      },
      {
        label: "Müşteri havuza düştüğünde bildirim gönder",
        value: "Alıcı: Admin · Kanal: Uygulama içi",
        trigger: "customer_moved_to_pool",
        audience: "admin_only",
        channel: "in_app",
        schedule: "immediate",
        status: "draft",
        description: "Ataması bozulan kayıtların tekrar değerlendirilmesini sağlar.",
      },
      {
        label: "Tag sıcak lead olduğunda bildirim gönder",
        value: "Alıcı: Atanmış kullanıcı · Kanal: Uygulama içi",
        trigger: "tag_hot_lead",
        audience: "assigned_user",
        channel: "in_app",
        schedule: "immediate",
        status: "active",
        description: "Öncelikli müşteri işaretlendiğinde satış temsilcisini uyarır.",
      },
      {
        label: "Bugünkü ilk randevu öncesi özet gönder",
        value: "Alıcı: İlgili kullanıcı · Kanal: Uygulama içi + popup",
        trigger: "daily_first_appointment_summary",
        audience: "assigned_user",
        channel: "in_app_and_popup",
        schedule: "thirty_minutes_before",
        status: "active",
        description: "Günün ilk randevusundan önce hazırlık özetini gösterir.",
      },
      {
        label: "Arşivlenen müşteri için bildirim gönder",
        value: "Alıcı: Admin · Kanal: Uygulama içi",
        trigger: "customer_archived",
        audience: "admin_only",
        channel: "in_app",
        schedule: "immediate",
        status: "paused",
        description: "Arşive alınan kayıtların operasyon takibine düşmesini sağlar.",
      },
      {
        label: "Yeni müşteri notu eklendiğinde bildirim gönder",
        value: "Alıcı: Atanmış kullanıcı ve admin · Kanal: Uygulama içi",
        trigger: "customer_note_added",
        audience: "admin_and_assigned",
        channel: "in_app",
        schedule: "immediate",
        status: "active",
        description: "Yeni not sonrası müşteri geçmişinin gözden kaçmamasını sağlar.",
      },
    ],
  },
];

export default function NotificationSettings() {
  const [activeChannel, setActiveChannel] = useState("email");
  const [channelStatus, setChannelStatus] = useState({
    email: true,
    browser: true,
  });
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleLabel, setEditingRuleLabel] = useState(null);
  const [ruleForm, setRuleForm] = useState(INITIAL_RULE_FORM);

  const selectedChannel = useMemo(
    () => CHANNELS.find((channel) => channel.id === activeChannel) ?? CHANNELS[0],
    [activeChannel]
  );

  const isSelectedChannelOpen = channelStatus[activeChannel];

  const handleStatusChange = (channelId, nextValue) => {
    setActiveChannel(channelId);
    setChannelStatus((prev) => ({
      ...prev,
      [channelId]: nextValue,
    }));
  };

  const openCreateRuleModal = () => {
    setEditingRuleLabel(null);
    setRuleForm(INITIAL_RULE_FORM);
    setRuleModalOpen(true);
  };

  const openEditRuleModal = (rule) => {
    setEditingRuleLabel(rule.label);
    setRuleForm({
      name: rule.label,
      trigger: rule.trigger || INITIAL_RULE_FORM.trigger,
      audience: rule.audience || INITIAL_RULE_FORM.audience,
      channel: rule.channel || INITIAL_RULE_FORM.channel,
      schedule: rule.schedule || INITIAL_RULE_FORM.schedule,
      status: rule.status || INITIAL_RULE_FORM.status,
      description: rule.description || "",
    });
    setRuleModalOpen(true);
  };

  const closeRuleModal = () => {
    setRuleModalOpen(false);
  };

  const handleRuleFormChange = (event) => {
    const { name, value } = event.target;
    setRuleForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const modalTitle = editingRuleLabel ? "Kuralı Düzenle" : "Kural Oluştur";
  const modalSaveLabel = editingRuleLabel ? "Güncelle" : "Oluştur";

  return (
    <>
      <div className="settings-panel-grid">
        <article className="settings-card">
          <div className="settings-card-header">
            <h2>Bildirim Kanalları</h2>
            <span>2 kanal</span>
          </div>
          <div className="settings-field-list">
            {CHANNELS.map((channel) => {
              const isOpen = channelStatus[channel.id];

              return (
                <div
                  key={channel.id}
                  className={`settings-select-row ${
                    activeChannel === channel.id ? "active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="settings-select-main"
                    onClick={() => setActiveChannel(channel.id)}
                  >
                    <div>
                      <strong>{channel.title}</strong>
                      <p>{channel.description}</p>
                    </div>
                  </button>

                  <div className="settings-toggle-group">
                    <button
                      type="button"
                      className={`settings-toggle-option ${isOpen ? "active" : ""}`}
                      onClick={() => handleStatusChange(channel.id, true)}
                    >
                      Açık
                    </button>
                    <button
                      type="button"
                      className={`settings-toggle-option ${!isOpen ? "active" : ""}`}
                      onClick={() => handleStatusChange(channel.id, false)}
                    >
                      Kapalı
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="settings-card">
          <div className="settings-card-header">
            <h2>{selectedChannel.settingsTitle}</h2>
            {activeChannel === "browser" ? (
              <button
                type="button"
                className="settings-icon-button settings-icon-button-primary"
                aria-label="Kural oluştur"
                title="Kural oluştur"
                onClick={openCreateRuleModal}
              >
                <Plus size={18} strokeWidth={2.2} />
              </button>
            ) : (
              <span>{isSelectedChannelOpen ? "Mock içerik" : "Kapalı"}</span>
            )}
          </div>

          {isSelectedChannelOpen ? (
            <div
              className={`settings-note-list ${
                activeChannel === "browser" ? "settings-note-list-scroll" : ""
              }`}
            >
              {selectedChannel.settings.map((item) => (
                <div key={item.label} className="settings-note-item">
                  {activeChannel === "browser" && (
                    <button
                      type="button"
                      className="settings-note-edit-button"
                      aria-label={`${item.label} kuralını düzenle`}
                      title="Düzenle"
                      onClick={() => openEditRuleModal(item)}
                    >
                      <Pencil size={14} strokeWidth={2.2} />
                    </button>
                  )}
                  <strong>{item.label}</strong>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="settings-empty-state">
              <strong>Bu kanal kapalı.</strong>
              <p>Bildirim ayarları gösterilmiyor.</p>
            </div>
          )}
        </article>
      </div>

      <NotificationRuleModal
        open={ruleModalOpen}
        title={modalTitle}
        saveLabel={modalSaveLabel}
        form={ruleForm}
        onChange={handleRuleFormChange}
        onClose={closeRuleModal}
      />
    </>
  );
}
