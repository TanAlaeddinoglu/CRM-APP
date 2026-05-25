export default function NotificationRuleModal({
  open,
  title,
  saveLabel,
  form,
  onChange,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box settings-modal-box">
        <h2 className="modal-title">{title}</h2>

        <div className="modal-body">
          <div className="modal-row">
            <label>Kural adı</label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Örn: Event oluşturulduğunda bildir"
            />
          </div>

          <div className="modal-row">
            <label>Tetikleyici</label>
            <select name="trigger" value={form.trigger} onChange={onChange}>
              <option value="event_created">Event oluşturuldu</option>
              <option value="appointment_before_1h">Randevuya 1 saat kala</option>
              <option value="customer_assigned">Müşteri atandı</option>
              <option value="payment_completed">Ödeme tamamlandı</option>
              <option value="customer_note_added">Müşteri notu eklendi</option>
            </select>
          </div>

          <div className="modal-row">
            <label>Alıcı grubu</label>
            <select name="audience" value={form.audience} onChange={onChange}>
              <option value="admin_only">Sadece admin</option>
              <option value="assigned_user">Atanmış kullanıcı</option>
              <option value="admin_and_assigned">Admin ve atanmış kullanıcı</option>
              <option value="actor_only">İşlemi yapan kullanıcı</option>
            </select>
          </div>

          <div className="modal-row">
            <label>Bildirim kanalı</label>
            <select name="channel" value={form.channel} onChange={onChange}>
              <option value="in_app">Sadece uygulama içi</option>
              <option value="popup">Sadece popup</option>
              <option value="in_app_and_popup">Uygulama içi + popup</option>
            </select>
          </div>

          <div className="settings-modal-grid">
            <div className="modal-row">
              <label>Zamanlama</label>
              <select name="schedule" value={form.schedule} onChange={onChange}>
                <option value="immediate">Anında</option>
                <option value="thirty_minutes_before">30 dk önce</option>
                <option value="one_hour_before">1 saat önce</option>
                <option value="one_day_before">1 gün önce</option>
              </select>
            </div>

            <div className="modal-row">
              <label>Durum</label>
              <select name="status" value={form.status} onChange={onChange}>
                <option value="active">Aktif</option>
                <option value="paused">Duraklatıldı</option>
                <option value="draft">Taslak</option>
              </select>
            </div>
          </div>

          <div className="modal-row">
            <label>Kural açıklaması</label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              placeholder="Bu kuralın ne yaptığına dair kısa not"
            />
          </div>
        </div>

        <div className="modal-footer settings-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            İptal
          </button>

          <div className="settings-modal-actions">
            <button type="button" className="btn-primary" onClick={onClose}>
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
