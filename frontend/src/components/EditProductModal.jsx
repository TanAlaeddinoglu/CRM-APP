// src/components/EditProductModal.jsx
import { useState } from "react";
import "../assets/css/ProductList.css";
import {toast} from "react-hot-toast";

export default function EditProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({
    name: product.name || "",
    description: product.description || "",
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
      toast.success("Ürün güncellendi!");
    } catch (err) {
      toast.error("Ürün güncellenemedi.");
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 className="modal-title">Ürün Düzenle</h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            <div className="modal-row">
              <label>Ürün Adı</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div className="modal-row">
              <label>Açıklama</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                style={{ resize: "vertical", padding: "10px 12px",
                         borderRadius: "8px", border: "1px solid var(--color-border)",
                         fontSize: "14px" }}
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
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
