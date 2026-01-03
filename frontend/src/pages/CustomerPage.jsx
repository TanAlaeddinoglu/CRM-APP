// src/pages/CustomerPage.jsx
import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSearchParams } from "react-router-dom";

import { getCustomers, getMyCustomers, importCustomersExcel, checkExistingByPhones } from "../services/customer.js";
import { getUsers } from "../services/user.js";
import { getTags } from "../services/tag.js";

import CustomerList from "../components/CustomerList.jsx";
import TagStatistics from "../components/TagStatistics.jsx";
import CustomerPageActions from "../components/customer/CustomerPageActions.jsx";
import CustomerFilterModal from "../components/customer/CustomerFilterModal.jsx";
import CustomerCreateModal from "../components/customer/CustomerCreateModal.jsx";

import ExcelImportModal from "../components/customer/ExcelImportModal.jsx";

const normalizePhone = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (!s) return "";
  return s.replace(/\D/g, "");
};
const toStr = (v) => (v === null || v === undefined ? "" : String(v).trim());
const makeRowId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const UI_COLS = ["Ad","Soyad","Email","Telefon","Şehir","Tag","Status","Assigned","Products","Updated","Source"];

export default function CustomerPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [searchParams] = useSearchParams();

  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Excel
  const fileInputRef = useRef(null);
  const [excelUploading, setExcelUploading] = useState(false);

  // Modal state
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [serverReport, setServerReport] = useState(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries([...searchParams]);
      const res = isAdmin ? await getCustomers(params) : await getMyCustomers(params);
      setCustomers(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
    } finally {
      setLoading(false);
    }
  };

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

  // ---- validation (client) ----
  const recomputeValidation = (rows) => {
    const base = (Array.isArray(rows) ? rows : []).map((r, idx) => {
      const phone = normalizePhone(r.Telefon);
      const name = toStr(r.Ad);
      const surname = toStr(r.Soyad);

      let _status = "ok";
      let _reason = "";

      if (!name || !surname) {
        _status = "invalid_phone";
        _reason = "missing_name";
      } else if (!phone || phone.length < 10 || phone.length > 13) {
        _status = "invalid_phone";
        _reason = "invalid_phone";
      }

      // eğer daha önce duplicate_in_db işaretlendiyse koru
      if (r._status === "duplicate_in_db") {
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
        Şehir: toStr(r["Şehir"]),
        Tag: toStr(r.Tag),
        Status: toStr(r.Status),
        Assigned: toStr(r.Assigned),
        Products: toStr(r.Products),
        Updated: toStr(r.Updated),
        Source: toStr(r.Source || "excel"),
        _status,
        _reason,
      };
    });

    // file duplicate check (only rows that are OK — not duplicate_in_db)
    const seen = new Map();
    return base.map((r) => {
      if (r._status !== "ok") return r;
      const phone = r.Telefon;
      const rowNo = r._rowNo ?? r._idx + 2;

      if (seen.has(phone)) {
        return { ...r, _status: "duplicate_in_file", _reason: "duplicate_in_file", _firstSeenRow: seen.get(phone) };
      }
      seen.set(phone, rowNo);
      return r;
    });
  };

  const setRowsWithValidation = (updaterOrArray) => {
    setExcelRows((prev) => {
      const next = typeof updaterOrArray === "function" ? updaterOrArray(prev) : updaterOrArray;
      return recomputeValidation(Array.isArray(next) ? next : []);
    });
  };

  // ---- parse excel ----
  const parseExcelToUiRows = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const rows = json.map((item, idx) => {
      const ui = {};
      UI_COLS.forEach((c) => (ui[c] = item[c] ?? ""));
      return { _id: makeRowId(), _rowNo: idx + 2, ...ui };
    });

    return recomputeValidation(rows);
  };

  // ---- excel flow ----
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

      // 1) parse + local validation
      let rows = await parseExcelToUiRows(file);

      // 2) DB check only for rows that have a phone and are locally ok
      const phones = rows
        .filter((r) => r._status === "ok" && r.Telefon)
        .map((r) => r.Telefon);

      const existingMap = await checkExistingByPhones(phones);

      // 3) mark rows as duplicate_in_db if exists
      rows = rows.map((r) => {
        const existId = existingMap[r.Telefon];
        if (existId) {
          return {
            ...r,
            _status: "duplicate_in_db",
            _reason: "duplicate_in_db",
            _existingCustomerId: existId,
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

  // ---- build excel for backend ----
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

  // ✅ Save: DB dup/file dup olsa bile problem değil -> sadece OK satırlar import edilir
  const handleSaveImport = async () => {
    const okRows = excelRows.filter((r) => r._status === "ok");
    if (okRows.length === 0) {
      alert("Kaydedilecek OK satır yok. Hatalı/duplicate satırları düzelt veya sil.");
      return;
    }

    const excelFile = buildExcelFileFromUiRows(okRows);

    setExcelUploading(true);
    try {
      const res = await importCustomersExcel(excelFile);
      setServerReport(res.data);
      setExcelModalOpen(false);
      await loadCustomers();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.file?.[0] ||
        err?.response?.data?.error ||
        err?.message ||
        "Excel kaydederken hata oluştu.";
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
        isAdmin={isAdmin}
        excelUploading={excelUploading}
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
      />

      <CustomerCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        tags={tags}
        onSuccess={loadCustomers}
      />

      <TagStatistics customers={customers} />
      <CustomerList customers={customers} totalCount={totalCount} />

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
      />
    </div>
  );
}
