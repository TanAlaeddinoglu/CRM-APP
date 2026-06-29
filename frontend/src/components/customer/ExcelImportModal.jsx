import React, { useMemo, useState } from "react";
import "./ExcelImportModal.css";

const mapReasonTR = (reason) => {
  switch (reason) {
    case "duplicate_in_file":
      return "Dup (Dosya)";
    case "duplicate_in_db":
      return "Mükerrer Kayıt";
    case "invalid_phone":
      return "Telefon Geçersiz";
    case "country_code_missing":
      return "Ülke Kodu Eksik";
    case "invalid_email":
      return "E-posta Geçersiz";
    case "missing_name":
      return "Ad Eksik";
    case "invalid":
      return "Geçersiz Satır";
    default:
      return reason || "-";
  }
};

const tagLabel = (t) => t?.tag_name || t?.name || t?.title || `Tag #${t?.id}`;
const userLabel = (u) => u?.username || u?.email || u?.name || `User #${u?.id}`;

const makeRowId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const isDigits = (v) => /^\d+$/.test(String(v || ""));
const getAssignedIdForRow = (row) => {
  if (row?._assignedId) return Number(row._assignedId);
  const raw = row?.Assigned;
  if (!raw) return null;
  if (isDigits(raw)) return Number(raw);
  return null;
};

// Human-readable labels for target fields shown in mapping dropdown
const FIELD_LABELS = {
  customer_name:      "Ad",
  customer_surname:   "Soyad",
  customer_name_full: "Ad Soyad",
  customer_email:     "E-posta",
  customer_phone:     "Telefon",
  city:               "Şehir",
  status:             "Durum",
  source:             "Kaynak",
  products:           "Ürünler",
};

// ─────────────────────────────────────────────
// Mapping Step
// ─────────────────────────────────────────────
function MappingStep({ columns, sampleRows, mapping, setMapping, targetFields, onBuildPreview, onClose, saving, fileName }) {
  const [savedMapping, setSavedMapping] = useState({});

  const fieldOptions = targetFields.length > 0
    ? targetFields
    : Object.entries(FIELD_LABELS).map(([value, label]) => ({ value, label }));

  const getFieldLabel = (value) => {
    const found = fieldOptions.find((f) => f.value === value);
    return found ? found.label : value;
  };

  const isChecked = (col) => !!(mapping[col] && mapping[col] !== "__ignore__");

  const handleCheck = (col, checked) => {
    if (!checked) {
      setSavedMapping((prev) => ({ ...prev, [col]: mapping[col] }));
      setMapping((prev) => ({ ...prev, [col]: "__ignore__" }));
    } else {
      const restore = savedMapping[col] && savedMapping[col] !== "__ignore__"
        ? savedMapping[col]
        : fieldOptions[0]?.value;
      setMapping((prev) => ({ ...prev, [col]: restore || "__ignore__" }));
    }
  };

  const handlePreview = () => {
    const filtered = Object.fromEntries(
      Object.entries(mapping).filter(([, v]) => v && v !== "__ignore__")
    );
    onBuildPreview(filtered);
  };

  const systemColumns = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const col of columns) {
      const target = mapping[col];
      if (target && target !== "__ignore__" && !seen.has(target)) {
        seen.add(target);
        result.push(target);
      }
    }
    return result;
  }, [columns, mapping]);

  const systemRows = useMemo(() => {
    return sampleRows.map((row) => {
      const out = {};
      for (const col of columns) {
        const target = mapping[col];
        if (target && target !== "__ignore__") {
          out[target] = row[col] ?? "";
        }
      }
      return out;
    });
  }, [sampleRows, mapping, columns]);

  return (
    <div className="excel-modal-backdrop" onClick={onClose}>
      <div className="excel-modal excel-modal--mapping" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="excel-modal-header excel-mapping-header">
          <div className="excel-mapping-header-info">
            <h3 className="excel-modal-title">Kolon Eşleştirme</h3>
            <p className="excel-modal-subtitle">
              {fileName && <span className="excel-mapping-filename">{fileName} · </span>}
              Kolon: <b>{columns.length}</b> · Örnek satır: <b>{sampleRows.length}</b>
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Kapat
          </button>
        </div>

        {/* Body: sol liste + sağ önizleme */}
        <div className="excel-mapping-body">

          {/* Sol panel: checkbox + kolon adı + dropdown */}
          <div className="excel-mapping-left">
            <div className="excel-mapping-left-header">
              <span>Kolon</span>
              <span>Sistem Alanı</span>
            </div>
            <div className="excel-mapping-left-rows">
              {columns.map((col) => {
                const checked = isChecked(col);
                return (
                  <div key={col} className={`excel-mapping-row${checked ? "" : " excel-mapping-row--off"}`}>
                    <input
                      type="checkbox"
                      id={`chk_${col}`}
                      checked={checked}
                      onChange={(e) => handleCheck(col, e.target.checked)}
                      className="excel-mapping-checkbox"
                    />
                    <span className="excel-mapping-col-name" title={col}>{col}</span>
                    {checked ? (
                      <select
                        className="excel-mapping-select"
                        value={mapping[col] || "__ignore__"}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [col]: e.target.value }))}
                      >
                        {fieldOptions.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="excel-mapping-select excel-mapping-select--off">Kullanma</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sağ panel: Ham Önizleme + CRM Önizleme */}
          <div className="excel-mapping-right">

            <div className="excel-mapping-preview-section">
              <div className="excel-mapping-preview-label">Excel&rsquo;den 3 Satır</div>
              <div className="excel-mapping-scroll-wrap">
                <table className="excel-mapping-preview-table">
                  <thead>
                    <tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row, i) => (
                      <tr key={i}>
                        {columns.map((col) => (
                          <td key={col}>
                            {row[col] != null && row[col] !== ""
                              ? String(row[col])
                              : <span className="excel-mapping-empty">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="excel-mapping-preview-section">
              <div className="excel-mapping-preview-label excel-mapping-preview-label--crm">Sistemde Nasıl Görünür?</div>
              <div className="excel-mapping-scroll-wrap">
                {systemColumns.length === 0 ? (
                  <p className="excel-mapping-no-mapping">Henüz eşleştirme yapılmadı.</p>
                ) : (
                  <table className="excel-mapping-preview-table excel-mapping-preview-table--system">
                    <thead>
                      <tr>{systemColumns.map((col) => <th key={col}>{getFieldLabel(col)}</th>)}</tr>
                    </thead>
                    <tbody>
                      {systemRows.map((row, i) => (
                        <tr key={i}>
                          {systemColumns.map((col) => (
                            <td key={col}>
                              {row[col] != null && row[col] !== ""
                                ? String(row[col])
                                : <span className="excel-mapping-empty">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="excel-mapping-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            İptal
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handlePreview}
            disabled={saving}
          >
            {saving ? "⏳ Yükleniyor..." : "Preview Oluştur"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Preview Step (existing content)
// ─────────────────────────────────────────────
function PreviewStep({
  rows,
  setRows,
  saving,
  onSave,
  serverReport,
  tags,
  users,
  onPhoneChange,
  onClose,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [distributionRows, setDistributionRows] = useState([{ userId: "", count: "" }]);
  const [bulkTag, setBulkTag] = useState("");
  const [bulkAssigned, setBulkAssigned] = useState("");

  const stats = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r._status === "ok").length;
    const dupFile = rows.filter((r) => r._status === "duplicate_in_file").length;
    const dupDb = rows.filter((r) => r._status === "duplicate_in_db").length;
    const invalid = rows.filter(
      (r) => !["ok", "duplicate_in_file", "duplicate_in_db"].includes(r._status)
    ).length;
    return { total, ok, dupFile, dupDb, invalid };
  }, [rows]);

  const selectedOkRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r._id) && r._status === "ok"),
    [rows, selectedIds]
  );
  const dbDuplicateCount = useMemo(
    () => rows.filter((r) => r._status === "duplicate_in_db").length,
    [rows]
  );
  const distributionPlanTotal = useMemo(
    () =>
      distributionRows.reduce((sum, row) => {
        const count = Number(row.count);
        return sum + (Number.isFinite(count) && count > 0 ? count : 0);
      }, 0),
    [distributionRows]
  );
  const distributionRemaining = selectedOkRows.length - distributionPlanTotal;

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
  const selectAllInvalid = () => {
    const ids = new Set(
      rows
        .filter((r) => r._status !== "ok")
        .filter((r) => r._status !== "duplicate_in_db" && r._status !== "duplicate_in_file")
        .map((r) => r._id)
    );
    setSelectedIds(ids);
  };
  const deleteSelected = () => {
    if (selectedIds.size === 0) { alert("Önce satır seçmelisin."); return; }
    setRows((prev) => prev.filter((r) => !selectedIds.has(r._id)));
    clearSelection();
  };

  const updateCell = (rowId, key, value) => {
    setRows((prev) => prev.map((r) => (r._id === rowId ? { ...r, [key]: value } : r)));
  };
  const updateCells = (rowId, updates) => {
    setRows((prev) => prev.map((r) => (r._id === rowId ? { ...r, ...updates } : r)));
  };
  const deleteRow = (rowId) => {
    setRows((prev) => prev.filter((r) => r._id !== rowId));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(rowId); return n; });
  };
  const addEmptyRow = () => {
    const newRow = {
      _id: makeRowId(), _rowNo: "", Ad: "", Soyad: "", Email: "",
      Telefon: "", "Şehir": "", Status: "active",
      Products: "", Source: "excel",
      Tag: "", _tagId: null, Assigned: "", _assignedId: null,
      _status: "invalid", _reason: "missing_name",
    };
    setRows((prev) => [newRow, ...(prev || [])]);
  };

  const applyBulkTagAssigned = () => {
    if (selectedIds.size === 0) { alert("Önce satır seçmelisin."); return; }
    if (!bulkTag && !bulkAssigned) { alert("Tag veya Assigned seçmelisin."); return; }
    setRows((prev) =>
      prev.map((r) => {
        if (!selectedIds.has(r._id)) return r;
        const updates = {};
        if (bulkTag) {
          const tag = tags.find((t) => String(t.id) === bulkTag);
          if (tag) { updates.Tag = tagLabel(tag); updates._tagId = tag.id; }
        }
        if (bulkAssigned) {
          const user = users.find((u) => String(u.id) === bulkAssigned);
          if (user) { updates.Assigned = userLabel(user); updates._assignedId = user.id; }
        }
        return { ...r, ...updates };
      })
    );
  };

  const updateDistributionRow = (idx, key, value) =>
    setDistributionRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  const addDistributionRow = () => setDistributionRows((prev) => [...prev, { userId: "", count: "" }]);
  const removeDistributionRow = (idx) =>
    setDistributionRows((prev) => prev.length <= 1 ? [{ userId: "", count: "" }] : prev.filter((_, i) => i !== idx));

  const applyDistribution = () => {
    if (dbDuplicateCount > 0) { alert("Mükerrer kayıt içeren satırlar varken dağıtım uygulanamaz."); return; }
    if (selectedOkRows.length === 0) { alert("Dağıtım için önce OK satır seçmelisin."); return; }
    const plan = distributionRows
      .map((row) => ({ user: users.find((u) => String(u.id) === String(row.userId)), count: Number(row.count) }))
      .filter((row) => row.user && Number.isFinite(row.count) && row.count > 0);
    if (plan.length === 0) { alert("Dağıtım planına en az bir user ve adet gir."); return; }
    const total = plan.reduce((sum, row) => sum + row.count, 0);
    if (total > selectedOkRows.length) { alert(`Dağıtım adedi seçili OK satır sayısından fazla. Seçili OK: ${selectedOkRows.length}, Plan: ${total}`); return; }
    if (total < selectedOkRows.length) alert(`Plan ${total} satırı dağıtacak. Kalan ${selectedOkRows.length - total} OK satır boş kalacak.`);
    const assignmentByRowId = new Map();
    let cursor = 0;
    for (const item of plan) {
      for (let i = 0; i < item.count; i += 1) {
        const target = selectedOkRows[cursor];
        if (!target) break;
        assignmentByRowId.set(target._id, item.user);
        cursor += 1;
      }
    }
    setRows((prev) =>
      prev.map((r) => {
        const user = assignmentByRowId.get(r._id);
        if (!user) return r;
        return { ...r, Assigned: userLabel(user), _assignedId: user.id };
      })
    );
  };

  const statusBadge = (r) => {
    if (r._status === "ok") return { text: "✓ OK", cls: "ok" };
    if (r._status === "duplicate_in_file") return { text: "⚠ Dup (Dosya)", cls: "warn-file" };
    if (r._status === "duplicate_in_db") return { text: "⚠ Mükerrer Kayıt", cls: "warn-db" };
    return { text: "✕ " + mapReasonTR(r._reason || r._status), cls: "err" };
  };

  const rowClass = (r) => {
    if (r._status === "ok") return "excel-tr--ok";
    if (r._status === "duplicate_in_file") return "excel-tr--warn-file";
    if (r._status === "duplicate_in_db") return "excel-tr--warn-db";
    return "excel-tr--err";
  };

  return (
    <>
      {/* ── Header ── */}
      <div className="excel-modal-header excel-preview-header">
        <div className="excel-preview-header-left">
          <h3 className="excel-modal-title">İçe Aktarma Önizleme</h3>
          <div className="excel-stat-chips">
            <span className="excel-stat-chip excel-stat-chip--total">Toplam <b>{stats.total}</b></span>
            <span className="excel-stat-chip excel-stat-chip--ok">OK <b>{stats.ok}</b></span>
            {stats.dupFile > 0 && <span className="excel-stat-chip excel-stat-chip--dup-file">Dup(Dosya) <b>{stats.dupFile}</b></span>}
            {stats.dupDb > 0 && <span className="excel-stat-chip excel-stat-chip--dup-db">Mükerrer <b>{stats.dupDb}</b></span>}
            {stats.invalid > 0 && <span className="excel-stat-chip excel-stat-chip--invalid">Hatalı <b>{stats.invalid}</b></span>}
            {selectedIds.size > 0 && <span className="excel-stat-chip excel-stat-chip--selected">Seçili <b>{selectedIds.size}</b></span>}
          </div>
        </div>
        <div className="excel-modal-header-actions">
          <button type="button" className="excel-btn-outline" onClick={addEmptyRow}>+ Satır Ekle</button>
          <button type="button" className="excel-btn-outline" onClick={onClose}>Kapat</button>
          <button type="button" className="excel-btn-save" onClick={onSave} disabled={saving}>
            {saving ? "Kaydediliyor..." : "✓ Kaydet"}
          </button>
        </div>
      </div>

      {/* ── Araç Çubuğu ── */}
      <div className="excel-toolbar">
        <div className="excel-toolbar-group">
          <span className="excel-toolbar-label">Seçim</span>
          <button type="button" className="excel-toolbar-btn" onClick={selectAllOk}>OK olanları seç</button>
          <button type="button" className="excel-toolbar-btn" onClick={selectAllDbDup}>Mükerrer kayıtları seç</button>
          <button type="button" className="excel-toolbar-btn" onClick={selectAllInvalid}>Hatalı seç</button>
          <button type="button" className="excel-toolbar-btn" onClick={clearSelection}>Temizle</button>
          <button type="button" className="excel-toolbar-btn excel-toolbar-btn--danger" onClick={deleteSelected}>Seçilileri Sil</button>
        </div>
        <div className="excel-toolbar-divider" />
        <div className="excel-toolbar-group">
          <span className="excel-toolbar-label">Toplu Atama</span>
          <select className="excel-toolbar-select" value={bulkTag} onChange={(e) => setBulkTag(e.target.value)}>
            <option value="">Etiket seç</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{tagLabel(t)}</option>)}
          </select>
          <select className="excel-toolbar-select" value={bulkAssigned} onChange={(e) => setBulkAssigned(e.target.value)}>
            <option value="">Kullanıcı seç</option>
            {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
          </select>
          <button type="button" className="excel-toolbar-btn excel-toolbar-btn--primary" onClick={applyBulkTagAssigned}>Uygula</button>
        </div>
      </div>

      <div className="excel-preview-workspace">
        {/* ── Dağıtım Paneli ── */}
        <div className="excel-distribution-panel">
          <div className="excel-distribution-head">
            <span className="excel-dist-title">Dağıtım Planı</span>
            <span className={`excel-distribution-summary ${distributionRemaining < 0 || dbDuplicateCount > 0 ? "is-warning" : ""}`}>
              OK: {selectedOkRows.length} · Plan: {distributionPlanTotal} · Kalan: {Math.max(distributionRemaining, 0)}
            </span>
          </div>
          <div className="excel-distribution-table">
            <div className="excel-distribution-table-head">
              <span>Kullanıcı</span><span>Adet</span><span></span>
            </div>
            {distributionRows.map((row, idx) => (
              <div key={idx} className="excel-distribution-row">
                <select value={row.userId} onChange={(e) => updateDistributionRow(idx, "userId", e.target.value)}>
                  <option value="">Kullanıcı seç</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
                </select>
                <input type="number" min="1" value={row.count} placeholder="Adet" onChange={(e) => updateDistributionRow(idx, "count", e.target.value)} />
                <button type="button" className="excel-dist-delete-btn" onClick={() => removeDistributionRow(idx)}>Sil</button>
              </div>
            ))}
          </div>
          <div className="excel-distribution-actions">
            <button type="button" className="excel-btn-outline" onClick={addDistributionRow}>+ Satır</button>
            <button type="button" className="excel-toolbar-btn excel-toolbar-btn--primary" onClick={applyDistribution}>Uygula</button>
          </div>
        </div>

        {/* ── Tablo ── */}
        <div className="excel-table-wrap">
          <table className="excel-table">
            <thead>
              <tr>
                <th>Seç</th><th>Durum</th><th>Ad</th><th>Soyad</th><th>Email</th>
                <th>Telefon</th><th>Şehir</th><th>Ürünler</th><th>Kaynak</th>
                <th>Kullanıcı</th><th>Etiket</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const badge = statusBadge(r);
                const selected = selectedIds.has(r._id);
                return (
                  <tr key={r._id} className={`${rowClass(r)}${selected ? " excel-tr--selected" : ""}`}>
                    <td className="excel-td-check">
                      <input id={`sel_${r._id}`} name={`sel_${r._id}`} type="checkbox" checked={selected} onChange={() => toggleSelect(r._id)} />
                    </td>
                    <td className="excel-td-status">
                      <span className={`excel-badge excel-badge--${badge.cls}`}>
                        {badge.text}
                        {r._status === "duplicate_in_file" && r._firstSeenRow ? <span className="excel-badge-note"> #{r._firstSeenRow}</span> : null}
                        {r._status === "duplicate_in_db" && r._existingCustomerId ? <span className="excel-badge-note"> #{r._existingCustomerId}</span> : null}
                      </span>
                      {r._status === "invalid" && r._errors?.length > 0 && (
                        <div className="excel-row-errors">
                          {r._errors.map((e, i) => <div key={i}>{e.message || e.field}</div>)}
                        </div>
                      )}
                    </td>
                    <td><input id={`ad_${r._id}`} name={`ad_${r._id}`} className="excel-input" value={r.Ad ?? ""} onChange={(e) => updateCell(r._id, "Ad", e.target.value)} /></td>
                    <td><input id={`soyad_${r._id}`} name={`soyad_${r._id}`} className="excel-input" value={r.Soyad ?? ""} onChange={(e) => updateCell(r._id, "Soyad", e.target.value)} /></td>
                    <td><input id={`email_${r._id}`} name={`email_${r._id}`} className="excel-input" value={r.Email ?? ""} onChange={(e) => updateCell(r._id, "Email", e.target.value)} /></td>
                    <td><input id={`telefon_${r._id}`} name={`telefon_${r._id}`} className="excel-input" value={r.Telefon ?? ""} onChange={(e) => { const value = e.target.value; updateCell(r._id, "Telefon", value); if (onPhoneChange) onPhoneChange(r._id, value); }} /></td>
                    <td><input id={`sehir_${r._id}`} name={`sehir_${r._id}`} className="excel-input" value={r["Şehir"] ?? ""} onChange={(e) => updateCell(r._id, "Şehir", e.target.value)} /></td>
                    <td><input id={`products_${r._id}`} name={`products_${r._id}`} className="excel-input" value={r.Products ?? ""} onChange={(e) => updateCell(r._id, "Products", e.target.value)} /></td>
                    <td><input id={`source_${r._id}`} name={`source_${r._id}`} className="excel-input" value={r.Source ?? ""} onChange={(e) => updateCell(r._id, "Source", e.target.value)} /></td>
                    <td>
                      <select className="excel-input" value={r._assignedId || ""}
                        onChange={(e) => {
                          const user = users.find((u) => String(u.id) === e.target.value);
                          updateCells(r._id, { _assignedId: user?.id || null, Assigned: user ? userLabel(user) : "" });
                        }}
                      >
                        <option value="">— seç —</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="excel-input" value={r._tagId || ""}
                        onChange={(e) => {
                          const tag = tags.find((t) => String(t.id) === e.target.value);
                          updateCells(r._id, { _tagId: tag?.id || null, Tag: tag ? tagLabel(tag) : "" });
                        }}
                      >
                        <option value="">— seç —</option>
                        {tags.map((t) => <option key={t.id} value={t.id}>{tagLabel(t)}</option>)}
                      </select>
                    </td>
                    <td className="excel-td-del">
                      <button type="button" className="excel-row-del-btn" onClick={() => deleteRow(r._id)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="excel-hint">
            * Veritabanında aynı telefona sahip kayıtlar "Mükerrer Kayıt" olarak işaretlenir. OK olmayan satırlar kaydedilmez. <br />
            * Mükerrer kayıt satırında gösterilen kullanıcı ve etiket mevcut sistemdeki değerlerdir. <br />
            * Telefon numarası değiştirildiğinde durum otomatik olarak yeniden hesaplanır.
          </div>
        </div>
      </div>

      {serverReport && (
        <div className="excel-report">
          <h4>Import Sonucu</h4>
          <div className="excel-report-meta">
            <span><b>Oluşturulan:</b> {serverReport.success_count ?? serverReport.created ?? "-"}</span>
            <span><b>Hatalı:</b> {serverReport.error_count ?? serverReport.errors ?? 0}</span>
            <span><b>Atlanan:</b> {serverReport.skipped_count ?? 0}</span>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────
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
  onPhoneChange,
  // mapping step props
  step = "preview",
  columns = [],
  sampleRows = [],
  mapping = {},
  setMapping,
  targetFields = [],
  onBuildPreview,
  fileName = "",
}) {
  if (!open) return null;

  if (step === "mapping") {
    return (
      <MappingStep
        columns={columns}
        sampleRows={sampleRows}
        mapping={mapping}
        setMapping={setMapping}
        targetFields={targetFields}
        onBuildPreview={onBuildPreview}
        onClose={onClose}
        saving={saving}
        fileName={fileName}
      />
    );
  }

  return (
    <div className="excel-modal-backdrop" onClick={onClose}>
      <div className="excel-modal" onClick={(e) => e.stopPropagation()}>
        <PreviewStep
          rows={rows}
          setRows={setRows}
          saving={saving}
          onSave={onSave}
          serverReport={serverReport}
          tags={tags}
          users={users}
          onPhoneChange={onPhoneChange}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
