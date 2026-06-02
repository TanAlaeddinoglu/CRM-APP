import { api } from "./api.js";

export const getUserDashboardSummary = (params) => {
  return api.get("/reports/user-dashboard-summary/", { params });
};

export const getMyPerformanceReport = (params) => {
  return api.get("/reports/my-performance/", { params });
};

export const getAppointmentsSummary = (params) => {
  return api.get("/reports/appointments-summary/", { params });
};

export const getPaymentSummary = (params) => {
  return api.get("/reports/payment-summary/", { params });
};

export const getProductPriceDistributionSummary = (params) => {
  return api.get("/reports/product-price-distribution-summary/", { params });
};
