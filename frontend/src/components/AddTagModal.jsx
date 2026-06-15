import React, { useState } from "react";
import { toast } from "react-hot-toast";
import "../assets/css/ProductList.css";

const COLOR_CHOICES = [
  { value: "#FF0000", label: "Kırmızı" },
  { value: "#800000", label: "Bordo" },
  { value: "#FFFF00", label: "Sarı" },
  { value: "#008000", label: "Yeşil" },
  { value: "#0000FF", label: "Mavi" },
  { value: "#00FFFF", label: "Açık Mavi" },
  { value: "#800080", label: "Mor" }
];

export default function AddTagModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    tag_name: "",
    slug: "",
    color: "",
    description: ""
  });

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));

    if (key === "tag_name") {
      const autoSlug = value
        .trim()
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^a-z0-9-]/g, "");

      setForm(prev => ({ ...prev, slug: autoSlug }));
    }
  };

const handleSubmit = async () => {
  if (!form.tag_name.trim()) return toast.error("Etiket adı zorunludur.");
  if (!form.slug.trim()) return toast.error("Slug zorunludur.");
  if (!form.color) return toast.error("Renk seçmelisiniz.");
  if (!form.description) return toast.error("Açıklama zorunludur.");


  try {
    await onSave(form); // success/error toast parent'ta
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className="modal-background">
      <div className="modal-box modal-box-sm">
        <h2 className="modal-title">Yeni Etiket Ekle</h2>

        <div className="modal-field">
          <label>Etiket Adı</label>
          <input
              className="modal-input"
              value={form.tag_name}
              onChange={(e) => handleChange("tag_name", e.target.value)}
          />
        </div>

        <div className="modal-field">
          <label>Slug</label>
          <input
              className="modal-input"
              value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
          />
        </div>

        <div className="modal-field">
          <label>Renk</label>
          <select
              className="modal-input"
              value={form.color}
              onChange={(e) => handleChange("color", e.target.value)}
          >
            <option value="">Renk seçin</option>
            {COLOR_CHOICES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label>Açıklama</label>
          <textarea
              className="modal-textarea"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>İptal</button>
          <button className="modal-save" onClick={handleSubmit}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}
