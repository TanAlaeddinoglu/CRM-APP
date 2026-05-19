// src/services/events/event.js
import { api } from "./api";

/* ================================
   APPOINTMENT PAYMENTS
================================ */

/**
 * GET /events/appointment-payments/
 * page, page_size, search gibi parametreleri alabilir
 */
export const getAppointmentPayments = (params = {}) => {
  return api.get("/events/appointment-payments/", { params });
};

/**
 * GET /events/appointment-payments/?customer=<id>
 * Customer bazlı filtre
 */
export const getAppointmentPaymentsByCustomer = (customerId) => {
  return api.get("/events/appointment-payments/", {
    params: { customer: customerId },
  });
};

/**
 * POST /events/appointment-payments/
 * Yeni ödeme oluştur
 */
export const createAppointmentPayment = (payload) => {
  return api.post("/events/appointment-payments/", payload);
};

/**
 * PATCH /events/appointment-payments/:id/
 * Ödeme güncelle
 */
export const updateAppointmentPayment = (id, payload) => {
  return api.patch(`/events/appointment-payments/${id}/`, payload);
};

/**
 * DELETE /events/appointment-payments/:id/
 * Ödeme sil
 */
export const deleteAppointmentPayment = (id) => {
  return api.delete(`/events/appointment-payments/${id}/`);
};

/* ================================
   APPOINTMENTS
================================ */

/**
 * GET /events/appointments/
 * search, page, page_size gibi parametre alabilir
 */
export const getAppointments = (params = {}) => {
  return api.get("/events/appointments/", { params });
};

/**
 * GET /events/appointments/:id/
 * Tek appointment detayı
 */
export const getAppointmentById = (id) => {
  return api.get(`/events/appointments/${id}/`);
};