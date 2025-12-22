import React, { useState } from "react";
import "../../src/assets/css/FilterModal.css";

const statuses = ["active", "inactive", "pool"];
const sources = ["manual", "form", "import"];
// assigned_to → ID girilecek
// tag → ID veya "null"

export default function FilterModal({ initialFilters, onClose, onApply }) {
  const [form, setForm] = useState(initialFilters);

  const update = (f, v) => setForm((prev) => ({ ...prev, [f]: v }));

  return (
    <div className="modal-bg">
      <div className="modal-box">
        <h3 className="modal-title">Filtreler</h3>

        <div className="modal-field">
          <label>Status</label>
          <select
            value={form.status || ""}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="">Tümü</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label>Source</label>
          <select
            value={form.source || ""}
            onChange={(e) => update("source", e.target.value)}
          >
            <option value="">Tümü</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label>Assigned To (User ID)</label>
          <input
            type="number"
            placeholder="User ID"
            value={form.assigned_to || ""}
            onChange={(e) => update("assigned_to", e.target.value)}
          />
        </div>

        <div className="modal-field">
          <label>Tag</label>
          <input
            type="text"
            placeholder="tag id veya null"
            value={form.tag || ""}
            onChange={(e) => update("tag", e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Kapat
          </button>
          <button className="btn-apply" onClick={() => onApply(form)}>
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
