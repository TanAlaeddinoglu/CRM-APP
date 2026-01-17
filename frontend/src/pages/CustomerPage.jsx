// src/pages/CustomerPage.jsx
import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  getCustomers,
  getMyCustomers,
  importCustomersExcel,
  checkExistingByPhones,
  updateCustomer,
} from "../services/customer.js";

import { getUsers } from "../services/user.js";
import { getTags } from "../services/tag.js";

import CustomerList from "../components/CustomerList.jsx";
import TagStatistics from "../components/TagStatistics.jsx";
import CustomerPageActions from "../components/customer/CustomerPageActions.jsx";
import CustomerFilterModal from "../components/customer/CustomerFilterModal.jsx";
import CustomerCreateModal from "../components/customer/CustomerCreateModal.jsx";
import CustomerBulkUpdateModal from "../components/customer/CustomerBulkUpdateModal.jsx";

import ExcelImportModal from "../components/customer/ExcelImportModal.jsx";

// ----------------------------
// Helpers
// ----------------------------
const toStr = (v) => (v === null || v === undefined ? "" : String(v).trim());
const makeRowId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

// normalize string for header matching
const normCol = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i") // ✅ TR dotless-i fix
    .trim();

// digits-only key (exact match)
const phoneKey = (v) => String(v || "").replace(/\D/g, "");

// keep leading + if present, remove other chars, handle "p:+...."
const normalizePhoneKeepPlus = (value) => {
  if (value === null || value === undefined) return "";
  let s = String(value).trim();
  if (!s) return "";

  s = s.replace(/^p:\s*/i, "").trim();

  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";

  return hasPlus ? `+${digits}` : digits;
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
const isNullishTag = (v) => {
  const s = toStr(v).toLowerCase();
  return !s || s === "-" || s === "null" || s === "none" || s === "undefined";
};
const isDigits = (v) => /^\d+$/.test(toStr(v));

// ----------------------------
// Disease mapping (Meta -> system)
// ----------------------------
const DISEASE_MAP = {
  erkenbosalma: "erken boşalma",
  sertlesme: "sertleşme",
  peniskalinlastirma: "kalınlaştırma",
  peniskalnlastirma: "kalınlaştırma", // ✅ “ı” silinince oluşan bozuk key için fallback
  buyutme: "büyütme",
  buyutmekalinlastirma: "büyütme kalınlaştırma",
  penisegriligi: "penis eğriliği",
};

const diseaseKey = (s) =>
  normCol(s)
    .replace(/_/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

// meta field: "penis_kalinlastirma|erken_bosalma|sertlesme"
const normalizeDiseasesToSystem = (raw) => {
  const s = toStr(raw);
  if (!s) return "";
  const parts = s
    .split(/[|,;]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const mapped = parts.map((p) => {
    const key = diseaseKey(p);
    return DISEASE_MAP[key] || p.replace(/_/g, " ").trim();
  });

  const seen = new Set();
  const uniq = [];
  for (const m of mapped) {
    const k = normCol(m);
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(m);
    }
  }
  return uniq.join(", ");
};

// ----------------------------
// Excel column mapping (auto-detect)
// ----------------------------
const EXCEL_CANDIDATES = {
  Ad: ["Ad", "first name", "firstname", "first_name", "first-name", "name"],
  Soyad: ["Soyad", "soyadı", "soyad", "soyadi", "surname", "last name", "lastname", "last_name"],
  Telefon: [
    "Telefon",
    "telefon",
    "telefon_nu",
    "telefon_no",
    "telefon_n",
    "telefon_numarası",
    "telefon_numarasi",
    "telefon numarası",
    "telefon numarasi",
    "phone",
    "phone_number",
    "tel",
    "gsm",
  ],
  Email: ["Email", "E-mail", "mail", "email"],
  "Şehir": ["Şehir", "şehir", "sehir", "city"],
  Products: [
    "Products",
    "hangi_işlem_ile_ilgileniyorsunuz_?",
    "hangi_islem_ile_ilgileniyorsunuz_?",
    "hangi_islem_ile_ilgileniyorsunuz__?",
    "hangi_i̇şlem_i̇le_i̇lgileniyorsunuz_?",
  ],
  Tag: ["Tag", "etiket"],
  Assigned: ["Assigned", "assigned_to", "sorumlu", "owner"],
  Status: ["Status", "durum"],
  Updated: ["Updated", "updated"],
  Source: ["Source", "source"],
};

const pickExcelValue = (rowObj, candidates) => {
  const obj = rowObj || {};
  const keyMap = {};
  Object.keys(obj).forEach((k) => (keyMap[normCol(k)] = k));

  for (const c of candidates) {
    const realKey = keyMap[normCol(c)];
    if (realKey !== undefined) return obj[realKey];
  }
  return "";
};

const UI_COLS = [
  "Ad",
  "Soyad",
  "Email",
  "Telefon",
  "Şehir",
  "Tag",
  "Status",
  "Assigned",
  "Products",
  "Updated",
  "Source",
];

// ----------------------------
// Helpers: resolve tag/assigned from row
// ----------------------------
const getTagIdForRow = (row, tags) => {
  if (row?._tagId) return Number(row._tagId);

  const raw = row?.Tag;
  if (isNullishTag(raw)) return null;

  if (isDigits(raw)) return Number(raw);

  const name = toStr(raw).toLowerCase();
  const found = Array.isArray(tags)
    ? tags.find((t) => toStr(t?.name || t?.tag_name).toLowerCase() === name)
    : null;

  return found?.id ? Number(found.id) : null;
};

const getAssignedIdForRow = (row) => {
  if (row?._assignedId) return Number(row._assignedId);
  const raw = row?.Assigned;
  if (!raw) return null;
  if (isDigits(raw)) return Number(raw);
  return null;
};

const patchCustomerMeta = async (customerId, { assignedId, tagId, city, products }) => {
  const payload = {};

  if (assignedId) payload.assigned_to = Number(assignedId);
  if (tagId) payload.tag = Number(tagId);

  const cityStr = (city ?? "").toString().trim();
  if (cityStr) payload.city = cityStr;

  // ✅ Products: string olarak gönderiyoruz (backend tarafında parse edip ilişki kuracağız)
  const productsStr = (products ?? "").toString().trim();
  if (productsStr) payload.products = productsStr;

  if (Object.keys(payload).length === 0) return;
  await updateCustomer(customerId, payload, true);
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

  // Modal state
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [serverReport, setServerReport] = useState(null);
  const excelRowsRef = useRef([]);
  const excelPhoneCheckTimers = useRef(new Map());
  const excelPhoneCheckSeq = useRef(new Map());
  const forcedStatus = archiveOnly ? "archived" : "active,pool";

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries([...searchParams]);
      params.status = forcedStatus;
      const res = isAdmin ? await getCustomers(params) : await getMyCustomers(params);
      setCustomers(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentStatus = searchParams.get("status") || "";
    if (currentStatus !== forcedStatus) {
      const params = new URLSearchParams(searchParams);
      params.set("status", forcedStatus);
      params.set("page", "1");
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } else if (!digits || digits.length < 10 || digits.length > 13) {
        _status = "invalid_phone";
        _reason = "invalid_phone";
      }

      if (st(r) === "duplicate_in_db") {
        _status = "duplicate_in_db";
        _reason = "duplicate_in_db";
      }

      return {
        ...r,
        _idx: idx,
        Ad: name,
        Soyad: surname,
        Email: toStr(r.Email),
        Telefon: phone,
        "Şehir": toStr(r["Şehir"]),
        Tag: toStr(r.Tag),
        Status: toStr(r.Status || "active"), // ✅ default active
        Assigned: toStr(r.Assigned),
        Products: toStr(r.Products),
        Updated: toStr(r.Updated),
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

    if (!nameValue || !digits || digits.length < 10 || digits.length > 13) return;

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
      } catch (err) {
        // Ignore transient check errors; user can re-edit to retry.
      }
    }, 500);

    timers.set(rowId, timer);
  };

  // ---------------------------------
  // Parse Excel -> UI rows
  // ---------------------------------
  const parseExcelToUiRows = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const rows = json.map((item, idx) => {
      const ui = {};

      ui["Ad"] = pickExcelValue(item, EXCEL_CANDIDATES.Ad);
      ui["Soyad"] = pickExcelValue(item, EXCEL_CANDIDATES.Soyad);
      ui["Email"] = pickExcelValue(item, EXCEL_CANDIDATES.Email);

      const rawPhone = pickExcelValue(item, EXCEL_CANDIDATES.Telefon);
      ui["Telefon"] = normalizePhoneKeepPlus(rawPhone);

      ui["Şehir"] = pickExcelValue(item, EXCEL_CANDIDATES["Şehir"]);

      const rawProducts = pickExcelValue(item, EXCEL_CANDIDATES.Products);
      ui["Products"] = normalizeDiseasesToSystem(rawProducts);

      ui["Tag"] = pickExcelValue(item, EXCEL_CANDIDATES.Tag);
      ui["Assigned"] = pickExcelValue(item, EXCEL_CANDIDATES.Assigned);
      ui["Status"] = pickExcelValue(item, EXCEL_CANDIDATES.Status) || "active"; // ✅ default active
      ui["Updated"] = pickExcelValue(item, EXCEL_CANDIDATES.Updated);
      ui["Source"] = pickExcelValue(item, EXCEL_CANDIDATES.Source) || "excel";

      UI_COLS.forEach((c) => {
        if (ui[c] === undefined) ui[c] = "";
      });

      return {
        _id: makeRowId(),
        _rowNo: idx + 2,
        ...ui,

        _tagId: null,
        _assignedId: null,

        _existingCustomerId: null,
        _dbAssigned: null,
        _dbTag: null,
      };
    });

    return recomputeValidation(rows);
  };

  const handleExcelImport = () => {
    if (!isAdmin) return;
    fileInputRef.current?.click();
  };

  const handleExcelFileChange = async (e) => {
    if (!isAdmin) return;

    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      setExcelUploading(true);

      let rows = await parseExcelToUiRows(file);

      const candidatePhones = rows
        .filter((r) => st(r) === "ok" && r.Telefon)
        .flatMap((r) => phoneCandidates(r.Telefon));

      const existingMap = await checkExistingByPhones(candidatePhones);

      rows = rows.map((r) => {
        const meta = getExistingMetaFromMap(existingMap, r.Telefon);
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
        return r;
      });

      rows = recomputeValidation(rows);
      setExcelRows(rows);
      setServerReport(null);
      setExcelModalOpen(true);
    } catch (err) {
      alert(err?.message || "Excel okunurken hata oluştu. (xlsx paketi kurulu mu?)");
    } finally {
      setExcelUploading(false);
    }
  };

  const buildExcelFileFromUiRows = (rows) => {
    const data = rows.map((r) => {
      const obj = {};
      UI_COLS.forEach((c) => (obj[c] = r[c] ?? ""));
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");

    const arr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arr], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    return new File([blob], "customer_import_modified.xlsx", { type: blob.type });
  };

  const handleSaveImport = async () => {
    const rows = Array.isArray(excelRows) ? excelRows : [];

    const createRows = rows.filter((r) => st(r) === "ok");
    const updateRows = rows.filter((r) => st(r) === "duplicate_in_db" && r._existingCustomerId);

    if (createRows.length === 0 && updateRows.length === 0) {
      alert("Kaydedilecek satır yok (ne yeni kayıt var, ne de güncellenecek duplicate).");
      return;
    }

    const blocking = rows.filter((r) => st(r) === "invalid_phone" || st(r) === "duplicate_in_file");
    if (blocking.length > 0) {
      alert("Hatalı veya dosya içi duplicate satırlar var. Kaydetmeden önce düzelt veya sil.");
      return;
    }

    setExcelUploading(true);
    try {
      // 1) Yeni kayıtları import et
      let importData = null;
      if (createRows.length > 0) {
        const excelFile = buildExcelFileFromUiRows(createRows);
        const res = await importCustomersExcel(excelFile);
        importData = res.data;
      }

      // 2) DB duplicate olanları update et (Assigned + Tag + City + Products)
      const updateSummary = { total: updateRows.length, updated: 0, skipped: 0, failed: [] };

      for (const r of updateRows) {
        const customerId = r._existingCustomerId;

        const tagId = getTagIdForRow(r, tags);
        const assignedId = getAssignedIdForRow(r);

        const city = r["Şehir"];
        const products = r["Products"];

        const hasCity = (city ?? "").toString().trim().length > 0;
        const hasProducts = (products ?? "").toString().trim().length > 0;

        if (!tagId && !assignedId && !hasCity && !hasProducts) {
          updateSummary.skipped++;
          continue;
        }

        try {
          await patchCustomerMeta(customerId, { assignedId, tagId, city, products });
          updateSummary.updated++;
        } catch (e) {
          updateSummary.failed.push({
            existing_customer_id: customerId,
            telefon: r.Telefon,
            error:
              e?.response?.data?.detail ||
              JSON.stringify(e?.response?.data) ||
              e?.message ||
              "update failed",
          });
        }
      }

      // 3) OK satırlar import sonrası: phone -> id bul, varsa tag/assigned/city/products PATCH
      if (createRows.length > 0) {
        const candidatePhones = createRows.flatMap((r) => phoneCandidates(r.Telefon));
        const phoneToMeta = await checkExistingByPhones(candidatePhones);

        for (const r of createRows) {
          const meta = getExistingMetaFromMap(phoneToMeta, r.Telefon);
          const customerId = meta?.id;
          if (!customerId) continue;

          const tagId = getTagIdForRow(r, tags);
          const assignedId = getAssignedIdForRow(r);
          const city = r["Şehir"];
          const products = r["Products"];

          if (
            tagId ||
            assignedId ||
            (city ?? "").toString().trim() ||
            (products ?? "").toString().trim()
          ) {
            try {
              await patchCustomerMeta(customerId, { assignedId, tagId, city, products });
            } catch (e) {
              console.warn("post-import patch failed", r.Telefon, e);
            }
          }
        }
      }

      // 4) rapor
      const mergedReport = {
        ...(importData || {}),
        updated_existing_total: updateSummary.total,
        updated_existing: updateSummary.updated,
        skipped_existing: updateSummary.skipped,
        failed_existing: updateSummary.failed,
      };

      setServerReport(mergedReport);
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

  if (loading) return <div>Loading customers...</div>;

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
        excelUploading={excelUploading}
        selectedCount={selectedIds.length}
        archiveMode={archiveOnly}
      />

      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
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
        onClose={() => setExcelModalOpen(false)}
        rows={excelRows}
        setRows={setRowsWithValidation}
        saving={excelUploading}
        onSave={handleSaveImport}
        serverReport={serverReport}
        tags={tags}
        users={users}
        onPhoneChange={handleExcelPhoneChange}
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
