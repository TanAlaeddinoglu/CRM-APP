import { useState } from "react";
import "../assets/css/editProfileModal.css";
import { toast } from "react-hot-toast";

export default function AddUserModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    role: "USER",
    is_active: true,
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

    // 🔥 FRONTEND VALIDATION
    if (!form.username.trim()) {
      toast.error("Kullanıcı adı zorunludur.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("E-posta zorunludur.");
      return;
    }
    if (!form.password.trim()) {
      toast.error("Şifre zorunludur.");
      return;
    }

    try {
      await onSave(form);
      toast.success("Kullanıcı oluşturuldu.");

      onClose();
    } catch (err) {
      console.error(err);

      const res = err.response?.data;

      if (res) {
        // 🔥 Backend validation messages
        Object.keys(res).forEach((field) => {
          toast.error(`${field}: ${res[field]}`);
        });
      } else {
        toast.error("Kullanıcı oluşturulamadı.");
      }
    }
  };
  return (
    <div className="add-user-modal-overlay">
      <div className="add-user-modal-box">

        <div className="add-user-modal-header">
          <h2 className="add-user-modal-title">Yeni Kullanıcı Ekle</h2>
          <p className="add-user-modal-subtitle">
            Rol ve erişim durumuyla birlikte kullanıcı hesabı oluşturun.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="add-user-modal-body">

            <div className="add-user-modal-row">
              <label>Kullanıcı Adı</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="add-user-modal-row">
              <label>E-posta</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
              />
            </div>

            <div className="add-user-modal-grid">
              <div className="add-user-modal-row">
                <label>Ad</label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                />
              </div>

              <div className="add-user-modal-row">
                <label>Soyad</label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="add-user-modal-row">
              <label>Şifre</label>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type="password"
                required
              />
            </div>

            <div className="add-user-modal-grid">
              <div className="add-user-modal-row">
                <label>Rol</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                </select>
              </div>

              <label className="add-user-checkbox-row">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                />
                <span>Aktif Kullanıcı</span>
              </label>
            </div>
          </div>

          <div className="add-user-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="btn-primary">
              Kullanıcı Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
