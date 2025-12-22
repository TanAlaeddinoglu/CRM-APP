// src/services/customerProducts.js
import { api } from "./api";

// 🔹 Belirli bir müşteriye ait ürün/hastalıkları getirir
export function getCustomerProducts(customerId) {
  return api.get("/products/customer-products/", {
    params: { customer: customerId },
  });
}

export function getAllProducts() {
  return api.get("/products/customer-products/");
}

export function addCustomerProduct(data) {
  return api.post("/products/customer-products/", data);
}

export function deleteCustomerProduct(id) {
  return api.delete(`/products/customer-products/${id}/`);
}
