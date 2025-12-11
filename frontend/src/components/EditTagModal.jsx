// src/components/EditTagModal.jsx
import React, { useEffect, useState } from "react";
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

export default function EditTagModal({ tag, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    tag_name: "",
    slug: "",
    color: "",
    description: "",
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (tag) {
      setForm({
        tag_name: tag.tag_name,
        slug: tag.slug,
        color: tag.color,
        description: tag.description,
      });
    }
  }, [tag]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));

    if (key === "tag_name") {
      const autoSlug = value
        .trim()
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setForm((prev) => ({ ...prev, slug: autoSlug }));
    }
  };

  const handleSubmit = async () => {
    if (!form.tag_name.trim()) return toast.error("Tag name is required");
    if (!form.slug.trim()) return toast.error("Slug is required");
    if (!form.color) return toast.error("Color is required");

    try {
      await onSave(form);
      toast.success("Tag updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update tag");
    }
  };

  return (
    <div className="modal-background">
      <div className="modal-box modal-box-sm">
        <h2 className="modal-title">Edit Tag</h2>

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
            {COLOR_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label>Description</label>
          <textarea
            className="modal-textarea"
            rows={3}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>

        <div className="modal-actions">
          {onDelete && (
            <button
              className="modal-delete"
              type="button"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          )}

          <div className="modal-actions-right">
            <button className="modal-cancel" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="modal-save" type="button" onClick={handleSubmit}>
              Save
            </button>
          </div>
        </div>

        {confirmDelete && (
          <div className="confirm-popup">
            <div className="confirm-box">
              <p className="confirm-text">
                Bu etiketi silerseniz, müşterilerinizin etiket bilgileri kaybolacaktır.
              </p>

              <div className="confirm-buttons">
                <button
                  className="confirm-cancel"
                  onClick={() => setConfirmDelete(false)}
                >
                  Vazgeç
                </button>

                <button
                  className="confirm-ok"
                  onClick={() => {
                    onDelete(tag.id);
                    setConfirmDelete(false);
                  }}
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
