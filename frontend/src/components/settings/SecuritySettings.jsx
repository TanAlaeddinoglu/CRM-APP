export default function SecuritySettings() {
  return (
    <div className="settings-panel-grid">
      <article className="settings-card">
        <div className="settings-card-header">
          <h2>Hesap Koruma</h2>
          <span>Aktif</span>
        </div>
        <div className="settings-field-list">
          <div className="settings-field-row">
            <div>
              <strong>İki adımlı doğrulama</strong>
              <p>Girişlerde SMS ve e-posta kodu ile ek kontrol.</p>
            </div>
            <span className="settings-badge success">Açık</span>
          </div>
          <div className="settings-field-row">
            <div>
              <strong>Son şifre değişikliği</strong>
              <p>Son güncelleme 14 gün önce yapıldı.</p>
            </div>
            <span className="settings-badge">14 gün</span>
          </div>
          <div className="settings-field-row">
            <div>
              <strong>Oturum güvenliği</strong>
              <p>Yeni cihazlarda ek onay zorunlu tutuluyor.</p>
            </div>
            <span className="settings-badge success">Zorunlu</span>
          </div>
        </div>
      </article>

      <article className="settings-card">
        <div className="settings-card-header">
          <h2>Erişim Kaydı</h2>
          <span>Son 24 saat</span>
        </div>
        <div className="settings-note-list">
          <div className="settings-note-item">
            <strong>Web panel girişi</strong>
            <p>İstanbul, TR üzerinden Chrome oturumu.</p>
          </div>
          <div className="settings-note-item">
            <strong>API token kontrolü</strong>
            <p>Aktif tokenlar haftalık olarak gözden geçiriliyor.</p>
          </div>
        </div>
      </article>
    </div>
  );
}
