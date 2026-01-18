// src/services/customer.js
import { api } from "./api";
import Cookies from "js-cookie";

// (Kullanılmıyorsa silebilirsin, şimdilik kalsın)
const userRole = Cookies.get("user_role");

// -----------------------------
// CUSTOMERS
// -----------------------------
export const getCustomerById = async (id, isAdmin) => {
  return isAdmin ? api.get(`/customers/${id}/`) : api.get(`/customers/me/${id}/`);
};

export const getCustomers = (params = {}) => api.get("/customers/", { params });
export const getMyCustomers = (params = {}) => api.get("/customers/me/", { params });

// ✅ NEW: TAG STATS (pagination bağımsız)
export const getCustomerTagStats = (params = {}) =>
  api.get("/customers/tag-stats/", { params });

export const getMyCustomerTagStats = (params = {}) =>
  api.get("/customers/me/tag-stats/", { params });

export function getCustomer(id) {
  return api.get(`/customers/${id}/`);
}

export function getMyCustomer(id) {
  return api.get(`/customers/me/${id}/`);
}

export function createCustomer(data, isAdmin) {
  return isAdmin ? api.post("/customers/", data) : api.post("/customers/me/", data);
}

/**
 * PATCH customer
 * Admin: /customers/:id/
 * User : /customers/me/:id/
 */
export function updateCustomer(id, data, isAdmin = false) {
  const url = isAdmin ? `/customers/${id}/` : `/customers/me/${id}/`;
  return api.patch(url, data);
}

// Delete customer (admin) - soft delete backend'de
export function deleteCustomer(id) {
  return api.delete(`/customers/${id}/`);
}

// -----------------------------
// BULK UPSERT (Excel duplicate "Kaydet")
// -----------------------------
export const bulkUpsertCustomers = (items = []) => {
  return api.post("/customers/bulk/upsert/", { items });
};

// -----------------------------
// BULK UPDATE (selection actions)
// -----------------------------
export const bulkUpdateCustomers = (items = []) => {
  return api.patch("/customers/bulk/", { items });
};

// -----------------------------
// NOTES
// -----------------------------
export function getCustomerNotes(customerId) {
  return api.get(`/customers/notes/?customerId=${customerId}`);
}

export function createCustomerNote(customerId, note) {
  // NotesSerializer expects customer_id (write_only -> customer FK)
  return api.post("/customers/notes/", { customer_id: customerId, note });
}

export function updateCustomerNote(noteId, note) {
  return api.patch(`/customers/notes/${noteId}/`, { note });
}

// -----------------------------
// TAG HISTORY
// -----------------------------
export function getCustomerTagHistory(customerId) {
  return api.get(`/customers/tag-history/?customerId=${customerId}`);
}

export function getTagHistoryById(id) {
  return api.get(`/customers/tag-history/${id}/`);
}

// -----------------------------
// TAGS (Tag endpoints)
// -----------------------------
export function getTags(params = {}) {
  return api.get("/customers/tag/", { params });
}

export function setCustomerTag(data) {
  if (data == null) {
    return Promise.reject(new Error("setCustomerTag: missing payload"));
  }

  if (typeof data === "string") {
    const name = data.trim();
    if (!name || name === "-") {
      return Promise.reject(new Error("setCustomerTag: empty tag name"));
    }
    return api.post("/customers/tag/", { name });
  }

  if (typeof data === "number") {
    return Promise.reject(
      new Error(
        "setCustomerTag: tag id given; do not POST. Use updateCustomer with tag=id."
      )
    );
  }

  if (typeof data === "object") {
    const raw = data.name ?? data.tag ?? data.label ?? data.title ?? "";
    const name = String(raw || "").trim();
    if (!name || name === "-") {
      return Promise.reject(new Error("setCustomerTag: empty tag name"));
    }
    return api.post("/customers/tag/", { ...data, name });
  }

  return Promise.reject(new Error("setCustomerTag: invalid payload type"));
}

export function updateCustomerTag(id, data) {
  return api.patch(`/customers/tag/${id}/`, data);
}

export function deleteCustomerTag(id) {
  return api.delete(`/customers/tag/${id}/`);
}

export const getTagDetail = (tagId) => api.get(`/customers/tag/${tagId}/`);

// -----------------------------
// HELPER: Resolve tag id
// -----------------------------
export async function resolveTagId(tagValue) {
  if (tagValue == null) return null;

  if (typeof tagValue === "number") return tagValue;

  if (typeof tagValue === "object") {
    if (tagValue.id) return Number(tagValue.id);

    if (tagValue.name && String(tagValue.name).trim()) {
      const res = await setCustomerTag(String(tagValue.name));
      return res?.data?.id ?? null;
    }
    return null;
  }

  if (typeof tagValue === "string") {
    const name = tagValue.trim();
    if (!name || name === "-") return null;

    if (/^\d+$/.test(name)) return Number(name);

    const res = await setCustomerTag(name);
    return res?.data?.id ?? null;
  }

  return null;
}

// -----------------------------
// EXCEL IMPORT
// -----------------------------
export const importCustomersExcel = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post("/customers/import-excel/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const dryRunCustomersExcel = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post("/customers/import-excel/dry-run/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// -----------------------------
// DB CHECK (phones -> existing customer meta)
// ✅ search sonucu içinden TELEFON exact eşleşeni seçer
// ✅ meta: { id, customer_phone, assigned_to, tag }
// -----------------------------
const phoneKey = (v) => String(v || "").replace(/\D/g, ""); // digits-only

export async function checkExistingByPhones(phones = [], concurrency = 8) {
  const uniq = Array.from(new Set((phones || []).filter(Boolean)));
  const result = {};
  if (uniq.length === 0) return result;

  let i = 0;

  async function worker() {
    while (i < uniq.length) {
      const idx = i++;
      const phone = uniq[idx];

      try {
        const res = await api.get("/customers/", { params: { search: phone } });
        const results = res?.data?.results || [];

        const targetKey = phoneKey(phone);
        if (!targetKey) continue;

        // exact match (digits-only)
        const exact = results.find((c) => phoneKey(c?.customer_phone) === targetKey);
        if (!exact?.id) continue;

        const meta = {
          id: exact.id,
          customer_phone: exact.customer_phone || null,
          assigned_to: exact.assigned_to ?? null, // list serializer: username döndürüyor olmalı
          tag: exact.tag ?? null, // list serializer: tag name döndürüyor olmalı
        };

        // aynı meta’yı farklı key’lerle yaz
        result[phone] = meta;
        result[targetKey] = meta;
        if (meta.customer_phone) result[meta.customer_phone] = meta;
      } catch (e) {
        // sessiz geç
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, uniq.length) },
    () => worker()
  );
  await Promise.all(workers);
  return result;
}
