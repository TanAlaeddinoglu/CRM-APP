// src/pages/CustomerPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  getCustomers,
  getMyCustomers,
  getImportColumns,
  previewImport,
  startImport,
  checkExistingByPhones,
} from "../services/customer.js";
import { toast } from "react-hot-toast";

import { getUsers } from "../services/user.js";
import { getTags } from "../services/tag.js";

import CustomerList from "../components/CustomerList.jsx";
import TagStatistics from "../components/TagStatistics.jsx";
import CustomerPageActions from "../components/customer/CustomerPageActions.jsx";
import CustomerFilterModal from "../components/customer/CustomerFilterModal.jsx";
import CustomerCreateModal from "../components/customer/CustomerCreateModal.jsx";
import CustomerBulkUpdateModal from "../components/customer/CustomerBulkUpdateModal.jsx";

import ExcelImportModal from "../components/customer/ExcelImportModal.jsx";
import LoadingIndicator from "../components/common/LoadingIndicator.jsx";
import { usePageTransition } from "../context/PageTransitionContext.jsx";

// ----------------------------
// Helpers
// ----------------------------
const toStr = (v) => (v === null || v === undefined ? "" : String(v).trim());
const makeRowId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

// digits-only key (exact match)
const phoneKey = (v) => String(v || "").replace(/\D/g, "");

// Telefon normalizasyonu — backend ile aynı kural:
// - "00..." → "00" kaldırılır
// - "0XXXXXXXXXX" (11 digit Türk) → başına 9 eklenir → "9XXXXXXXXXXX"
// - Sonuç: 11-15 digit arası kabul
const normalizePhoneKeepPlus = (value) => {
  if (value === null || value === undefined) return "";
  let s = String(value).trim();
  if (!s) return "";

  s = s.replace(/^p:\s*/i, "").trim();

  if (s.startsWith("00")) s = s.slice(2);
  s = s.startsWith("+") ? s.slice(1) : s;

  const digits = s.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("0") && digits.length === 11) return "9" + digits;
  return digits;
};

// candidates for searching/mapping (+ / no + / raw)
const phoneCandidates = (value) => {
  const p = normalizePhoneKeepPlus(value);
  const d = phoneKey(p);
  const withPlus = d ? `+${d}` : "";
  const withoutPlus = d || "";
  const arr = [p, withPlus, withoutPlus].filter(Boolean);
  return Array.from(new Set(arr));
};

const st = (r) => String(r?._status || "").toLowerCase();
const isDigits = (v) => /^\d+$/.test(toStr(v));
const getAssignedIdForRow = (row) => {
  if (row?._assignedId) return Number(row._assignedId);
  const raw = row?.Assigned;
  if (!raw) return null;
  if (isDigits(raw)) return Number(raw);
  return null;
};

const getExistingMetaFromMap = (existingMap, phoneValue) => {
  if (!existingMap) return null;
  const candidates = phoneCandidates(phoneValue);
  const d = phoneKey(phoneValue);

  for (const c of candidates) {
    if (existingMap[c]) return existingMap[c];
  }
  if (d && existingMap[d]) return existingMap[d];
  return null;
};

export default function CustomerPage({ archiveOnly = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);

  // Excel
  const fileInputRef = useRef(null);
  const [excelUploading, setExcelUploading] = useState(false);
  usePageTransition(loading || excelUploading);

  // Modal state
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [serverReport, setServerReport] = useState(null);
  const [excelJobId, setExcelJobId] = useState(null);
  const excelRowsRef = useRef([]);
  const excelPhoneCheckTimers = useRef(new Map());
  const excelPhoneCheckSeq = useRef(new Map());

  // Mapping step state
  const [excelStep, setExcelStep] = useState(null);        // "mapping" | "preview"
  const [excelRawFile, setExcelRawFile] = useState(null);  // File object reused for preview
  const [excelColumns, setExcelColumns] = useState([]);
  const [excelSampleRows, setExcelSampleRows] = useState([]);
  const [excelMapping, setExcelMapping] = useState({});
  const [excelTargetFields, setExcelTargetFields] = useState([]);
  const forcedStatus = archiveOnly ? "archived" : "";

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries([...searchParams]);
      if (forcedStatus) {
        params.status = forcedStatus;
      } else if (!params.status) {
        params.status = "active,pool";
      }
      const res = isAdmin ? await getCustomers(params) : await getMyCustomers(params);
      setCustomers(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentStatus = searchParams.get("status") || "";
    if (forcedStatus && currentStatus !== forcedStatus) {
      const params = new URLSearchParams(searchParams);
      params.set("status", forcedStatus);
      params.set("page", "1");
      setSearchParams(params, { replace: true });
    } else if (!forcedStatus && !currentStatus) {
      const params = new URLSearchParams(searchParams);
      params.set("status", "active,pool");
      params.set("page", "1");
      setSearchParams(params, { replace: true });
    }
  }, [forcedStatus, searchParams, setSearchParams]);

  useEffect(() => {
    async function init() {
      await loadCustomers();

      const tagRes = await getTags();
      setTags(tagRes.data || []);

      if (isAdmin) {
        const userRes = await getUsers();
        setUsers(userRes.data || []);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => {
    excelRowsRef.current = excelRows;
  }, [excelRows]);

  // ---------------------------------
  // Validation on UI rows
  // ---------------------------------
  const recomputeValidation = (rows) => {
    const base = (Array.isArray(rows) ? rows : []).map((r, idx) => {
      const phone = normalizePhoneKeepPlus(r.Telefon);
      const digits = phoneKey(phone);

      const name = toStr(r.Ad);
      const surname = toStr(r.Soyad);

      let _status = "ok";
      let _reason = "";

      if (!name) {
        _status = "invalid_phone";
        _reason = "missing_name";
      } else if (!digits || digits.length < 11 || digits.length > 15) {
        _status = "invalid_phone";
        _reason = digits && digits.length === 10 ? "country_code_missing" : "invalid_phone";
      }

      if (st(r) === "duplicate_in_db") {
        _status = "duplicate_in_db";
        _reason = "duplicate_in_db";
      } else if (st(r) === "invalid_email") {
        _status = "invalid_email";
        _reason = "invalid_email";
      } else if (st(r) === "invalid") {
        // Server-side validation failure — preserve unless client caught a different issue first
        if (_status === "ok") {
          _status = "invalid";
          _reason = r._reason || "invalid";
        }
      }

      return {
        ...r,
        _idx: idx,
        Ad: name,
        Soyad: surname,
        Email: toStr(r.Email),
        Telefon: phone,
        "Şehir": toStr(r["Şehir"]),
        Status: toStr(r.Status || "active"),
        Products: toStr(r.Products),
        Source: toStr(r.Source || "excel"),

        _status,
        _reason,
      };
    });

    const seen = new Map();
    return base.map((r) => {
      if (st(r) !== "ok") return r;

      const digits = phoneKey(r.Telefon);
      const rowNo = r._rowNo ?? r._idx + 2;

      if (seen.has(digits)) {
        return {
          ...r,
          _status: "duplicate_in_file",
          _reason: "duplicate_in_file",
          _firstSeenRow: seen.get(digits),
        };
      }
      seen.set(digits, rowNo);
      return r;
    });
  };

  const setRowsWithValidation = (updaterOrArray) => {
    setExcelRows((prev) => {
      const next = typeof updaterOrArray === "function" ? updaterOrArray(prev) : updaterOrArray;
      return recomputeValidation(Array.isArray(next) ? next : []);
    });
  };

  const clearDbDuplicateMeta = (row) => ({
    ...row,
    _existingCustomerId: null,
    _dbAssigned: null,
    _dbTag: null,
    ...(st(row) === "duplicate_in_db" ? { _status: "ok", _reason: "" } : {}),
  });

  const handleExcelPhoneChange = (rowId, phoneValue) => {
    const timers = excelPhoneCheckTimers.current;
    const seqMap = excelPhoneCheckSeq.current;

    if (timers.has(rowId)) {
      clearTimeout(timers.get(rowId));
      timers.delete(rowId);
    }

    setRowsWithValidation((prev) => prev.map((r) => (r._id === rowId ? clearDbDuplicateMeta(r) : r)));

    const row = (excelRowsRef.current || []).find((r) => r._id === rowId);
    const nameValue = row?.Ad;
    const normalized = normalizePhoneKeepPlus(phoneValue);
    const digits = phoneKey(normalized);

    if (!nameValue || !digits || digits.length < 11 || digits.length > 15) return;

    const nextSeq = (seqMap.get(rowId) || 0) + 1;
    seqMap.set(rowId, nextSeq);

    const timer = setTimeout(async () => {
      if (seqMap.get(rowId) !== nextSeq) return;

      try {
        const existingMap = await checkExistingByPhones(phoneCandidates(normalized));
        if (seqMap.get(rowId) !== nextSeq) return;
        const meta = getExistingMetaFromMap(existingMap, normalized);

        setRowsWithValidation((prev) =>
          prev.map((r) => {
            if (r._id !== rowId) return r;
            if (meta?.id) {
              return {
                ...r,
                _status: "duplicate_in_db",
                _reason: "duplicate_in_db",
                _existingCustomerId: meta.id,
                _dbAssigned: meta.assigned_to || null,
                _dbTag: meta.tag || null,
              };
            }
            return clearDbDuplicateMeta(r);
          })
        );
      } catch {
        // Ignore transient check errors; user can re-edit to retry.
      }
    }, 500);

    timers.set(rowId, timer);
  };

  const handleExcelImport = () => {
    if (!isAdmin) return;
    fileInputRef.current?.click();
  };

  const buildAutoMapping = (columns, suggested, targetFields) => {
    const norm = (s) => String(s || "").toLowerCase().replace(/[\s_\-\.]/g, "");
    const result = { ...suggested };
    for (const col of columns) {
      if (result[col] && result[col] !== "__ignore__") continue;
      const nc = norm(col);
      for (const f of targetFields) {
        if (norm(f.value) === nc || norm(f.label) === nc) {
          result[col] = f.value;
          break;
        }
      }
    }
    return result;
  };

  const handleExcelFileChange = async (e) => {
    if (!isAdmin) return;

    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      setExcelUploading(true);
      const res = await getImportColumns(file, "customer");
      const data = res.data || {};
      const columns = data.columns || [];
      const targetFields = data.target_fields || [];
      const autoMapping = buildAutoMapping(columns, data.suggested_mapping || {}, targetFields);
      setExcelRawFile(file);
      setExcelColumns(columns);
      setExcelSampleRows(data.sample_rows || []);
      setExcelMapping(autoMapping);
      setExcelTargetFields(targetFields);
      setServerReport(null);
      setExcelStep("mapping");
      setExcelModalOpen(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Excel kolonları okunamadı.");
    } finally {
      setExcelUploading(false);
    }
  };

  const handleBuildPreview = async (mapping) => {
    try {
      setExcelUploading(true);
      const res = await previewImport(excelRawFile, "customer", mapping);
      const data = res.data || {};
      setExcelJobId(data.job_id || null);
      setExcelRows(recomputeValidation(mapPreviewRowsToUiRows(data.rows || [])));
      setExcelStep("preview");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Önizleme oluşturulamadı.");
    } finally {
      setExcelUploading(false);
    }
  };

  const handleExcelModalClose = () => {
    setExcelModalOpen(false);
    setExcelStep(null);
    setExcelRawFile(null);
    setExcelColumns([]);
    setExcelSampleRows([]);
    setExcelMapping({});
    setExcelTargetFields([]);
  };

  const mapPreviewRowsToUiRows = (previewRows = []) => {
    return previewRows.map((item, idx) => ({
      _id: makeRowId(),
      _rowNo: item._row_no || idx + 2,
      Ad: item.customer_name || "",
      Soyad: item.customer_surname || "",
      Email: item.customer_email || "",
      Telefon: item.customer_phone || "",
      "Şehir": item.city || "",
      Status: item.status || "active",
      Products: item.products || "",
      Source: item.source || "excel",
      Tag: item.tag || "",
      _tagId: null,
      Assigned: "",
      _assignedId: null,
      _status: item._status || "ok",
      _reason: item._reason || "",
      _existingCustomerId: null,
      _firstSeenRow: item._first_seen_row || null,
      _errors: item._errors || [],
    }));
  };

  const handleSaveImport = async () => {
    const rows = Array.isArray(excelRows) ? excelRows : [];

    const createRows = rows.filter((r) => st(r) === "ok");

    if (createRows.length === 0) {
      alert("Kaydedilecek OK satır yok.");
      return;
    }

    const blocking = rows.filter((r) => st(r) === "invalid_phone" || st(r) === "duplicate_in_file");
    if (blocking.length > 0) {
      alert("Hatalı veya dosya içi duplicate satırlar var. Kaydetmeden önce düzelt veya sil.");
      return;
    }

    if (!excelJobId) {
      alert("Import job ID bulunamadı. Lütfen dosyayı tekrar yükleyin.");
      return;
    }

    setExcelUploading(true);
    try {
      const payloadRows = createRows.map((r) => ({
        customer_name: r.Ad,
        customer_surname: r.Soyad,
        customer_email: r.Email || null,
        customer_phone: r.Telefon,
        city: r["Şehir"] || null,
        assigned_to: getAssignedIdForRow(r),
        tag: r._tagId ? Number(r._tagId) : null,
        products: r.Products || null,
        source: r.Source || "excel",
        status: r.Status || "active",
      }));
      const res = await startImport(excelJobId, payloadRows);
      setServerReport(res.data);
      setExcelModalOpen(false);
      await loadCustomers();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.file?.[0] ||
        err?.response?.data?.error ||
        err?.message ||
        "Kaydetme sırasında hata oluştu.";
      alert(msg);
    } finally {
      setExcelUploading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator inline label="Müşteriler yükleniyor" />;
  }

  return (
    <div className="customer-page-wrapper">
      <CustomerPageActions
        onOpenFilter={() => setFilterOpen(true)}
        onOpenCreate={() => setCreateOpen(true)}
        onExcelImport={handleExcelImport}
        onOpenBulkUpdate={() => setBulkOpen(true)}
        onOpenArchive={() =>
          navigate(archiveOnly ? "/customers" : "/customers/archive")
        }
        isAdmin={isAdmin}
        exportModel="customer"
        currentUserEmail={user?.email || ""}
        excelUploading={excelUploading}
        selectedCount={selectedIds.length}
        archiveMode={archiveOnly}
      />

      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          style={{ display: "none" }}
          onChange={handleExcelFileChange}
        />
      )}

      <CustomerFilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        users={users}
        tags={tags}
        isAdmin={isAdmin}
        forceStatus={forcedStatus}
      />

      <CustomerCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        tags={tags}
        onSuccess={loadCustomers}
      />

      <TagStatistics customers={customers} />
      <CustomerList
        customers={customers}
        totalCount={totalCount}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <ExcelImportModal
        open={excelModalOpen}
        onClose={handleExcelModalClose}
        rows={excelRows}
        setRows={setRowsWithValidation}
        saving={excelUploading}
        onSave={handleSaveImport}
        serverReport={serverReport}
        tags={tags}
        users={users}
        onPhoneChange={handleExcelPhoneChange}
        step={excelStep}
        columns={excelColumns}
        sampleRows={excelSampleRows}
        mapping={excelMapping}
        setMapping={setExcelMapping}
        targetFields={excelTargetFields}
        onBuildPreview={handleBuildPreview}
        fileName={excelRawFile?.name || ""}
      />

      <CustomerBulkUpdateModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={() => {
          setSelectedIds([]);
          loadCustomers();
        }}
        selectedIds={selectedIds}
        tags={tags}
        users={users}
      />
    </div>
  );
}
