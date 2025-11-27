// src/services/product.js
import { api } from "./api";

export function getProducts() {
  return api.get("/products/");
}

export function createProduct(data) {
  // backend slug, created_by, created_at'i hallediyor
  return api.post("/products/", data);
}

export function updateProduct(id, data) {
  return api.patch(`/products/${id}/`, data);
}


// export function deleteProduct(id) {
//   return api.delete(`/products/${id}/`);
// }
