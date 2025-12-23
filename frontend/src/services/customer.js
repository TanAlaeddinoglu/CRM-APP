// src/services/customer.js
import { api } from "./api";

import Cookies from "js-cookie";

const userRole = Cookies.get("user_role");

export const getCustomerById = async (id, isAdmin) => {
  if (isAdmin) {
    return api.get(`/customers/${id}/`);
  } else {
    return api.get(`/customers/me/${id}/`);
  }
};


export const getCustomers = (params = {}) =>
  api.get("/customers/", { params });

export const getMyCustomers = (params = {}) =>
  api.get("/customers/me/", { params });


// --- Get single customer (admin or owner) ---
export function getCustomer(id) {
  return api.get(`/customers/${id}/`);
}

// --- Get single customer owned by user ---
export function getMyCustomer(id) {
  return api.get(`/customers/me/${id}/`);
}

// --- Create customer (admin only, I guess?) ---
export function createCustomer(data, isAdmin) {
  return isAdmin
    ? api.post("/customers/", data)
    : api.post("/customers/me/", data);
}


// --- Update customer (admin can update all, user only own customer) ---
// src/services/customer.js
export function updateCustomer(id, data, isAdmin = false) {
  const url = isAdmin
    ? `/customers/${id}/`
    : `/customers/me/${id}/`;

  return api.patch(url, data);
}


// --- Delete customer ---
export function deleteCustomer(id) {
  return api.delete(`/customers/${id}/`);
}

//NOTE ENDPOINTLERI

export function getCustomerNotes(customerId) {
  return api.get(`/customers/notes/?customerId=${customerId}`);
}
export function createCustomerNote(customerId, note) {
  return api.post("/customers/notes/", {
    customer_id: customerId,
    note,
  });
}

export function updateCustomerNote(noteId, note) {
  return api.patch(`/customers/notes/${noteId}/`, {
    note,
  });
}

//TAG HISTORY
export function getCustomerTagHistory(customerId) {
  return api.get(`/customers/tag-history/?customerId=${customerId}`);
}

export function getTagHistoryById(id) {
  return api.get(`/customers/tag-history/${id}/`);
}

//TAG ENDPOINTLERI
export function setCustomerTag(data) {
  return api.post("/customers/tag/", data);
}


export function updateCustomerTag(id, data) {
  return api.patch(`/customers/tag/${id}/`, data);
}

export function deleteCustomerTag(id) {
  return api.delete(`/customers/tag/${id}/`);
}


//TAG DETAY
export const getTagDetail = (tagId) => api.get(`/customers/tag/${tagId}/`);
