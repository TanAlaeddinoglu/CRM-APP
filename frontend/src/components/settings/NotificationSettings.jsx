import { useMemo, useState } from "react";

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
    settingsTitle: "Tarayıcı bildirim ayarları",
    settings: [
      {
        label: "İzin durumu",
        value: "Bu cihaz için tarayıcı bildirim izni aktif tutuluyor.",
      },
      {
        label: "Görünürlük",
        value: "Yeni görevler, yaklaşan randevular ve geciken ödemeler gösteriliyor.",
      },
      {
        label: "Sessiz saatler",
        value: "22:00 - 08:00 arasında yalnızca kritik uyarılar gösteriliyor.",
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

  return (
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
          <span>{isSelectedChannelOpen ? "Mock içerik" : "Kapalı"}</span>
        </div>

        {isSelectedChannelOpen ? (
          <div className="settings-note-list">
            {selectedChannel.settings.map((item) => (
              <div key={item.label} className="settings-note-item">
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
  );
}
