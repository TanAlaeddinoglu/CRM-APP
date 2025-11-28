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
      toast.error("Product name is required.");
      return;
    }

    try {
      await onSave(form);
      toast.success("Product created!");
    } catch (err) {
      toast.error("Failed to create product.");
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 className="modal-title">Add Product</h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            <div className="modal-row">
              <label>Product Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Product name"
              />
            </div>

            <div className="modal-row">
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Short description (optional)"
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
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
