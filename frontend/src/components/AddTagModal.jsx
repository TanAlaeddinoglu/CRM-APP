import React, { useState } from "react";
import { toast } from "react-hot-toast";
import "../assets/css/ProductList.css";

const COLOR_CHOICES = [
  { value: "#FF0000", label: "Red" },
  { value: "#800000", label: "Maroon" },
  { value: "#FFFF00", label: "Yellow" },
  { value: "#008000", label: "Green" },
  { value: "#0000FF", label: "Blue" },
  { value: "#00FFFF", label: "Aqua" },
  { value: "#800080", label: "Purple" }
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
  if (!form.tag_name.trim()) return toast.error("Tag name is required");
  if (!form.slug.trim()) return toast.error("Slug is required");
  if (!form.color) return toast.error("You must choose a color");
  if (!form.description) return toast.error("You must write description");


  try {
    await onSave(form); // success/error toast parent'ta
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className="modal-background">
      <div className="modal-box modal-box-sm">
        <h2 className="modal-title">Add New Tag</h2>

        <div className="modal-field">
          <label>Tag Name</label>
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
          <label>Color</label>
          <select
              className="modal-input"
              value={form.color}
              onChange={(e) => handleChange("color", e.target.value)}
          >
            <option value="">Choose color</option>
            {COLOR_CHOICES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label>Description</label>
          <textarea
              className="modal-textarea"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-save" onClick={handleSubmit}>Save</button>
        </div>
      </div>
    </div>
  );
}
