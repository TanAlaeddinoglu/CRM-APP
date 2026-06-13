import { useState } from "react";
import "../assets/css/editProfileModal.css";
import { toast } from "react-hot-toast";

export default function EditProfileModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    username: user.username || "",
    email: user.email || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    is_active: user.is_active ?? true,
    role: user.role || "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basit validation
    if (!form.username.trim()) {
      toast.error("Kullanıcı adı boş olamaz.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("E-posta boş olamaz.");
      return;
    }

    const dataToSend = { ...form };

    // Password boşsa gönderme
    if (!dataToSend.password) {
      delete dataToSend.password;
    }

    try {
      await onSave(dataToSend);        // parent function
      toast.success("Kullanıcı güncellendi.");

      onClose();                       // modal kapat
    } catch (err) {
      console.error(err);

      if (err.response?.data) {
        // Backend validation error'larını toast olarak göster
        const errors = err.response.data;
        Object.keys(errors).forEach((field) => {
          toast.error(`${field}: ${errors[field]}`);
        });
      } else {
        toast.error("Kullanıcı güncellenemedi.");
      }
    }
  };
  return (
    <div className="edit-profile-modal-overlay">
      <div className="edit-profile-modal-box">
        <div className="edit-profile-modal-header">
          <h2 className="edit-profile-modal-title">Profili Düzenle</h2>
          <p className="edit-profile-modal-subtitle">
            Hesap bilgilerini, rolü ve erişim durumunu güncelleyin.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="edit-profile-modal-body">
            <div className="edit-profile-modal-row">
              <label>Kullanıcı Adı</label>
              <input name="username" value={form.username} onChange={handleChange} />
            </div>

            <div className="edit-profile-modal-row">
              <label>E-posta</label>
              <input name="email" value={form.email} onChange={handleChange} />
            </div>

            <div className="edit-profile-modal-grid">
              <div className="edit-profile-modal-row">
                <label>Ad</label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                />
              </div>

              <div className="edit-profile-modal-row">
                <label>Soyad</label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="edit-profile-modal-row">
              <label>Yeni Şifre (isteğe bağlı)</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Değiştirmek istemiyorsanız boş bırakın"
              />
            </div>

            <div className="edit-profile-modal-grid">
              <div className="edit-profile-modal-row">
                <label>Rol</label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                </select>
              </div>

              <label className="edit-profile-checkbox-row">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                />
                <span>Aktif Kullanıcı</span>
              </label>
            </div>

            <div className="edit-profile-modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">
                İptal
              </button>
              <button type="submit" className="btn-primary">
                Kaydet
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
