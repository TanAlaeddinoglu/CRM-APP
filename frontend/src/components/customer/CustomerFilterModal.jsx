// src/components/customer/CustomerFilterModal.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../../assets/css/FilterModal.css";

const STATUS_CHOICES = ["active", "archived", "quarantine", "pool"];
const SOURCE_CHOICES = ["meta", "google", "manual"];

export default function CustomerFilterModal({
  isOpen,
  onClose,
  users = [],
  tags = [],
  isAdmin = false,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [form, setForm] = useState({
    status: "",
    source: "",
    assigned_to: "",
    tag: "",
  });

  /* URL → FORM sync */
  useEffect(() => {
    if (!isOpen) return;

    setForm({
      status: searchParams.get("status") || "",
      source: searchParams.get("source") || "",
      assigned_to: searchParams.get("assigned_to") || "",
      tag: searchParams.get("tag") || "",
    });
  }, [isOpen, searchParams]);

  if (!isOpen) return null;

  const applyFilter = () => {
    const params = {};

    Object.entries(form).forEach(([key, value]) => {
      // user ise sadece tag gönder
      if (!isAdmin && key !== "tag") return;

      if (value !== "") {
        params[key] = value;
      }
    });

    setSearchParams(params);
    onClose();
  };

  const resetFilter = () => {
    setSearchParams({});
    onClose();
  };

  return (
    <div className="modal-background">
      <div className="modal-box modal-box-sm">
        <h3>Filtrele</h3>

        {/* 🔐 STATUS – SADECE ADMIN */}
        {isAdmin && (
          <>
            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value }))
              }
            >
              <option value="">Hepsi</option>
              {STATUS_CHOICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        )}

        {/* 🔐 SOURCE – SADECE ADMIN */}
        {isAdmin && (
          <>
            <label>Source</label>
            <select
              value={form.source}
              onChange={(e) =>
                setForm((p) => ({ ...p, source: e.target.value }))
              }
            >
              <option value="">Hepsi</option>
              {SOURCE_CHOICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        )}

        {/* 🔐 ASSIGNED USER – SADECE ADMIN */}
        {isAdmin && (
          <>
            <label>Atanan Kullanıcı</label>
            <select
              value={form.assigned_to}
              onChange={(e) =>
                setForm((p) => ({ ...p, assigned_to: e.target.value }))
              }
            >
              <option value="">Hepsi</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </>
        )}

        {/* ✅ TAG – HERKES */}
        <label>Tag</label>
        <select
          value={form.tag}
          onChange={(e) =>
            setForm((p) => ({ ...p, tag: e.target.value }))
          }
        >
          <option value="">Hepsi</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.tag_name}
            </option>
          ))}
        </select>

        <div className="modal-actions">
          <button className="btn-danger" onClick={resetFilter}>
            Reset
          </button>
          <div>
            <button className="btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button className="btn-primary" onClick={applyFilter}>
              Uygula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
