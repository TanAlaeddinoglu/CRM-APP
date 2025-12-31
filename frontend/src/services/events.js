// src/services/events/event.js
import { api } from "./api";

/* ================================
   APPOINTMENT PAYMENTS
   ================================ */

/**
 * GET /events/appointment-payments/
 * Tüm appointment ödemelerini getirir
 */
export const getAppointmentPayments = () => {
  return api.get("/events/appointment-payments/");
};

/**
 * GET /events/appointment-payments/?customer=<id>
 * Customer bazlı filtre (backend destekliyorsa)
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
 * GET /events/appointments/
 * Tüm appointment’ları getirir
 */
export const getAppointments = () => {
  return api.get("/events/appointments/");
};

/**
 * GET /events/appointments/:id/
 * Tek appointment detayı
 */
export const getAppointmentById = (id) => {
  return api.get(`/events/appointments/${id}/`);
};

/**
 * DELETE /events/appointment-payments/:id/
 * Ödeme sil
 */
export const deleteAppointmentPayment = (id) => {
  return api.delete(`/events/appointment-payments/${id}/`);
};
