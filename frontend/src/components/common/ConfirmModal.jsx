import React from "react";
import "./ConfirmModal.css";

export default function ConfirmModal({
  open,
  title = "Onayla",
  description = "Bu işlemi onaylıyor musunuz?",
  confirmText = "Onayla",
  cancelText = "Vazgeç",
  onConfirm,
  onCancel,
  children,
}) {
  if (!open) return null;

  return (
    <div className="modal-background">
      <div className="modal-box modal-box-sm">
        <h3>{title}</h3>

        <p className="confirm-text">{description}</p>

        {/* 🔥 Opsiyonel içerik (değişen alan listesi vs.) */}
        {children}

        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            className="btn-primary"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
