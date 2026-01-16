import React, { useMemo, useState } from "react";
import "./ExcelImportModal.css";

const mapReasonTR = (reason) => {
  switch (reason) {
    case "duplicate_in_file":
      return "Dosya içinde duplicate telefon";
    case "duplicate_in_db":
      return "DB’de aynı telefon var";
    case "invalid_phone":
      return "Telefon geçersiz";
    case "missing_name":
      return "Ad eksik";
    default:
      return reason || "-";
  }
};

const tagLabel = (t) => t?.tag_name || t?.name || t?.title || `Tag #${t?.id}`;
const userLabel = (u) => u?.username || u?.email || u?.name || `User #${u?.id}`;

const makeRowId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

export default function ExcelImportModal({
  open,
  onClose,
  rows = [],
  setRows,
  saving,
  onSave,
  serverReport,
  tags = [],
  users = [],
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkTagId, setBulkTagId] = useState("");
  const [bulkAssignedId, setBulkAssignedId] = useState("");

  const stats = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r._status === "ok").length;
    const dupFile = rows.filter((r) => r._status === "duplicate_in_file").length;
    const dupDb = rows.filter((r) => r._status === "duplicate_in_db").length;
    const invalid = rows.filter((r) => r._status === "invalid_phone").length;
    return { total, ok, dupFile, dupDb, invalid };
  }, [rows]);

  if (!open) return null;

  // selection
  const toggleSelect = (rowId) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(rowId)) n.delete(rowId);
      else n.add(rowId);
      return n;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const selectAllOk = () => {
    const ids = new Set(rows.filter((r) => r._status === "ok").map((r) => r._id));
    setSelectedIds(ids);
  };

  const selectAllDbDup = () => {
    const ids = new Set(rows.filter((r) => r._status === "duplicate_in_db").map((r) => r._id));
    setSelectedIds(ids);
  };

  // row ops
  const updateCell = (rowId, key, value) => {
    setRows((prev) => prev.map((r) => (r._id === rowId ? { ...r, [key]: value } : r)));
  };

  const deleteRow = (rowId) => {
    setRows((prev) => prev.filter((r) => r._id !== rowId));
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.delete(rowId);
      return n;
    });
  };

  const addEmptyRow = () => {
    const newRow = {
      _id: makeRowId(),
      _rowNo: "",
      Ad: "",
      Soyad: "",
      Email: "",
      Telefon: "",
      Şehir: "",
      Tag: "",
      Status: "",
      Assigned: "",
      Products: "",
      Updated: "",
      Source: "excel",
      _status: "invalid_phone",
      _reason: "missing_name",
    };
    setRows((prev) => [newRow, ...(prev || [])]);
  };

  // bulk
  const applyBulk = () => {
    if (selectedIds.size === 0) {
      alert("Önce satır seçmelisin.");
      return;
    }

    const selectedTag = bulkTagId ? tags.find((t) => String(t.id) === String(bulkTagId)) : null;
    const selectedUser = bulkAssignedId
      ? users.find((u) => String(u.id) === String(bulkAssignedId))
      : null;

    const tagText = selectedTag ? tagLabel(selectedTag) : null;
    const userText = selectedUser ? userLabel(selectedUser) : null;

    setRows((prev) =>
      prev.map((r) => {
        if (!selectedIds.has(r._id)) return r;
        return {
          ...r,
          ...(tagText !== null ? { Tag: tagText, _tagId: selectedTag?.id } : {}),
          ...(userText !== null ? { Assigned: userText, _assignedId: selectedUser?.id } : {}),
        };
      })
    );
  };

  // status badge
  const statusBadge = (r) => {
    if (r._status === "ok") return { text: "OK", cls: "ok" };
    if (r._status === "duplicate_in_file") return { text: mapReasonTR(r._reason), cls: "warn" };
    if (r._status === "duplicate_in_db") return { text: mapReasonTR(r._reason), cls: "warn" };
    return { text: mapReasonTR(r._reason), cls: "err" };
  };

  return (
    <div className="excel-modal-backdrop" onClick={onClose}>
      <div className="excel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="excel-modal-header">
          <div>
            <h3 className="excel-modal-title">Excel Önizleme</h3>
            <div className="excel-modal-subtitle">
              Toplam: <b>{stats.total}</b> • OK: <b>{stats.ok}</b> • Dup(File):{" "}
              <b>{stats.dupFile}</b> • Dup(DB): <b>{stats.dupDb}</b> • Hatalı:{" "}
              <b>{stats.invalid}</b>
            </div>
          </div>

          <div className="excel-modal-header-actions">
            <button type="button" className="btn-secondary" onClick={addEmptyRow}>
              + Satır Ekle
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>

        <div className="excel-bulk-bar">
          <div className="excel-bulk-left">
            <span className="excel-bulk-title">Toplu işlemler (seçili satırlar):</span>

            <button type="button" className="btn-secondary" onClick={selectAllOk}>
              OK olanları seç
            </button>

            <button type="button" className="btn-secondary" onClick={selectAllDbDup}>
              DB duplicate olanları seç
            </button>

            <button type="button" className="btn-secondary" onClick={clearSelection}>
              Seçimi temizle
            </button>

            <div className="excel-bulk-field">
              <span>Toplu Tag:</span>
              <select value={bulkTagId} onChange={(e) => setBulkTagId(e.target.value)}>
                <option value="">— seç —</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {tagLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="excel-bulk-field">
              <span>Toplu Assigned:</span>
              <select value={bulkAssignedId} onChange={(e) => setBulkAssignedId(e.target.value)}>
                <option value="">— seç —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {userLabel(u)}
                  </option>
                ))}
              </select>
            </div>

            <button type="button" className="btn-secondary" onClick={applyBulk}>
              Uygula
            </button>
          </div>

          <div className="excel-bulk-right">
            <button
              type="button"
              className="btn-primary"
              onClick={onSave}
              disabled={saving}
              style={{ opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "⏳ Kaydediliyor..." : "✅ Kaydet (Import)"}
            </button>
          </div>
        </div>

        <div className="excel-table-wrap">
          <table className="excel-table">
            <thead>
              <tr>
                <th>Seç</th>
                <th>Durum</th>
                <th>Ad</th>
                <th>Soyad</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Şehir</th>
                <th>Tag</th>
                <th>Assigned</th>
                <th>Products</th>
                <th>Updated</th>
                <th>Source</th>
                <th>Sil</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const badge = statusBadge(r);
                const selected = selectedIds.has(r._id);
                const isDbDup = r._status === "duplicate_in_db";

                const dbInfo =
                  isDbDup && (r._dbAssigned || r._dbTag)
                    ? `DB: ${r._dbAssigned || "-"} / ${r._dbTag || "-"}`
                    : null;

                return (
                  <tr key={r._id}>
                    <td>
                      <input
                        id={`sel_${r._id}`}
                        name={`sel_${r._id}`}
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(r._id)}
                      />
                    </td>

                    <td>
                      <span className={`excel-badge ${badge.cls}`}>
                        {badge.text}
                        {r._status === "duplicate_in_file" && r._firstSeenRow ? (
                          <span className="excel-badge-note"> (ilk: {r._firstSeenRow})</span>
                        ) : null}
                        {r._status === "duplicate_in_db" && r._existingCustomerId ? (
                          <span className="excel-badge-note"> (id: {r._existingCustomerId})</span>
                        ) : null}
                      </span>

                      {dbInfo ? (
                        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.75 }}>{dbInfo}</div>
                      ) : null}
                    </td>

                    <td>
                      <input
                        id={`ad_${r._id}`}
                        name={`ad_${r._id}`}
                        className="excel-input"
                        value={r.Ad ?? ""}
                        onChange={(e) => updateCell(r._id, "Ad", e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        id={`soyad_${r._id}`}
                        name={`soyad_${r._id}`}
                        className="excel-input"
                        value={r.Soyad ?? ""}
                        onChange={(e) => updateCell(r._id, "Soyad", e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        id={`email_${r._id}`}
                        name={`email_${r._id}`}
                        className="excel-input"
                        value={r.Email ?? ""}
                        onChange={(e) => updateCell(r._id, "Email", e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        id={`telefon_${r._id}`}
                        name={`telefon_${r._id}`}
                        className="excel-input"
                        value={r.Telefon ?? ""}
                        onChange={(e) => updateCell(r._id, "Telefon", e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        id={`sehir_${r._id}`}
                        name={`sehir_${r._id}`}
                        className="excel-input"
                        value={r["Şehir"] ?? ""}
                        onChange={(e) => updateCell(r._id, "Şehir", e.target.value)}
                      />
                    </td>

                    <td>
                      <select
                        id={`tag_${r._id}`}
                        name={`tag_${r._id}`}
                        className="excel-select"
                        value={r._tagId ?? ""}
                        onChange={(e) => {
                          const id = e.target.value;
                          const t = tags.find((x) => String(x.id) === String(id));
                          updateCell(r._id, "_tagId", id ? Number(id) : null);
                          updateCell(r._id, "Tag", t ? tagLabel(t) : "");
                        }}
                      >
                        <option value="">—</option>
                        {tags.map((t) => (
                          <option key={t.id} value={t.id}>
                            {tagLabel(t)}
                          </option>
                        ))}
                      </select>

                      {isDbDup && r._dbTag ? (
                        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.75 }}>
                          DB Tag: {r._dbTag}
                        </div>
                      ) : null}
                    </td>

                    <td>
                      <select
                        id={`assigned_${r._id}`}
                        name={`assigned_${r._id}`}
                        className="excel-select"
                        value={r._assignedId ?? ""}
                        onChange={(e) => {
                          const id = e.target.value;
                          const u = users.find((x) => String(x.id) === String(id));
                          updateCell(r._id, "_assignedId", id ? Number(id) : null);
                          updateCell(r._id, "Assigned", u ? userLabel(u) : "");
                        }}
                      >
                        <option value="">—</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {userLabel(u)}
                          </option>
                        ))}
                      </select>

                      {isDbDup && r._dbAssigned ? (
                        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.75 }}>
                          DB User: {r._dbAssigned}
                        </div>
                      ) : null}
                    </td>

                    <td>
                      <input
                        id={`products_${r._id}`}
                        name={`products_${r._id}`}
                        className="excel-input"
                        value={r.Products ?? ""}
                        onChange={(e) => updateCell(r._id, "Products", e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        id={`updated_${r._id}`}
                        name={`updated_${r._id}`}
                        className="excel-input"
                        value={r.Updated ?? ""}
                        onChange={(e) => updateCell(r._id, "Updated", e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        id={`source_${r._id}`}
                        name={`source_${r._id}`}
                        className="excel-input"
                        value={r.Source ?? ""}
                        onChange={(e) => updateCell(r._id, "Source", e.target.value)}
                      />
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => deleteRow(r._id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="excel-hint">
            * DB’de olanlar “Dup(DB)” olarak görünür. OK olmayan satırlar kaydedilmez. <br />
            * Dup(DB) satırında “DB: kullanıcı / tag” mevcut durumdur. <br />
            * Telefonu değiştirince durum otomatik yeniden hesaplanır (CustomerPage içinde).
          </div>
        </div>

        {serverReport && (
          <div className="excel-report">
            <h4>Import Sonucu</h4>
            <div className="excel-report-meta">
              <span>
                <b>Toplam:</b> {serverReport.total_rows ?? "-"}
              </span>
              <span>
                <b>Oluşturulan:</b> {serverReport.created ?? "-"}
              </span>
              <span>
                <b>DB duplicate:</b> {serverReport.duplicates_in_db ?? 0}
              </span>
              <span>
                <b>Hatalı:</b> {serverReport.errors ?? 0}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
