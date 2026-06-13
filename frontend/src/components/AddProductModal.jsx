// src/components/AddProductModal.jsx
import { useState } from "react";
import "../assets/css/ProductList.css";
import { toast } from "react-hot-toast";

export default function AddProductModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Ürün adı zorunludur.");
      return;
    }

    try {
      await onSave(form);
      toast.success("Ürün oluşturuldu!");
    } catch (err) {
      toast.error("Ürün oluşturulamadı.");
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 className="modal-title">Ürün Ekle</h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-field">
              <label>Ürün Adı</label>
              <input
                className="modal-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ürün adı"
              />
            </div>

            <div className="modal-field">
              <label>Açıklama</label>
              <textarea
                className="modal-textarea"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Kısa açıklama (isteğe bağlı)"
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              İptal
            </button>
            <button type="submit" className="btn-primary">
              Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
