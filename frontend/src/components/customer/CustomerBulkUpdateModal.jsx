import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { bulkUpdateCustomers } from "../../services/customer";
import "../../assets/css/CustomerCreateModal.css";

const ADMIN_STATUS_CHOICES = ["active", "archived", "pool"];

export default function CustomerBulkUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  selectedIds = [],
  tags = [],
  users = [],
}) {
  const [status, setStatus] = useState("");
  const [tagId, setTagId] = useState("");
  const [assignedId, setAssignedId] = useState("");

  const selectedCount = selectedIds.length;

  const statusClears = useMemo(
    () => status === "pool" || status === "archived",
    [status]
  );

  if (!isOpen) return null;

  const resetForm = () => {
    setStatus("");
    setTagId("");
    setAssignedId("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resolveNullable = (value) => (value === "__clear__" ? null : Number(value));

  const handleSubmit = async () => {
    if (selectedCount === 0) {
      toast.error("Önce müşteri seçmelisin");
      return;
    }

    const hasChange = status || tagId || assignedId;
    if (!hasChange) {
      toast.error("En az bir alan seçmelisin");
      return;
    }

    if (status === "active" && (!tagId || !assignedId)) {
      toast.error("Active için kullanıcı ve tag seçiniz");
      return;
    }

    const items = selectedIds.map((id) => {
      const payload = { id };
      if (status) payload.status = status;
      if (tagId) payload.tag_id = resolveNullable(tagId);
      if (assignedId) payload.assigned_to_id = resolveNullable(assignedId);
      return payload;
    });

    try {
      await bulkUpdateCustomers(items);
      toast.success("Toplu güncelleme tamamlandı");
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("Toplu güncelleme başarısız");
    }
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    if (value === "pool" || value === "archived") {
      setTagId("");
      setAssignedId("");
    }
  };

  return (
    <div className="modal-background">
      <div className="modal-box modal-box-md">
        <h3>Toplu Güncelle ({selectedCount})</h3>

        <div className="modal-form-grid">
          <select
            className="full"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">Status değiştir</option>
            {ADMIN_STATUS_CHOICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {status === "active" && (
            <div className="full input-hint">Active için kullanıcı ve tag seçiniz</div>
          )}

          <select
            className="full"
            value={tagId}
            disabled={statusClears}
            onChange={(e) => setTagId(e.target.value)}
          >
            <option value="">Tag değiştir</option>
            <option value="__clear__">Tag temizle</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tag_name}
              </option>
            ))}
          </select>

          <select
            className="full"
            value={assignedId}
            disabled={statusClears}
            onChange={(e) => setAssignedId(e.target.value)}
          >
            <option value="">Assigned değiştir</option>
            <option value="__clear__">Assigned temizle</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleClose}>
            İptal
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
