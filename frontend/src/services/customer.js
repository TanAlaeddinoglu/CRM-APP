// src/services/customer.js
import { api } from "./api";

// --- ADMIN: get all customers ---
export function getCustomers() {
  return api.get("/customers/");
}

// --- USER: get only own customers ---
export function getMyCustomers() {
  return api.get("/customers/me/");
}

// --- Get single customer (admin or owner) ---
export function getCustomer(id) {
  return api.get(`/customers/${id}/`);
}

// --- Get single customer owned by user ---
export function getMyCustomer(id) {
  return api.get(`/customers/me/${id}/`);
}

// --- Create customer (admin only, I guess?) ---
export function createCustomer(data) {
  return api.post("/customers/", data);
}

// --- Update customer (admin can update all, user only own customer) ---
export function updateCustomer(id, data) {
  return api.patch(`/customers/${id}/`, data);
}

// --- Delete customer ---
export function deleteCustomer(id) {
  return api.delete(`/customers/${id}/`);
}
