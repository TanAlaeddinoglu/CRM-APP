import { api } from "./api";

export function getTags() {
  return api.get("/customers/tag/");
}

export function getTag(id) {
  return api.get(`/customers/tag/${id}/`);
}

export function createTag(data) {
  return api.post("/customers/tag/", data);
}

export function updateTag(id, data) {
  return api.patch(`/customers/tag/${id}/`, data);
}

export function deleteTag(id) {
  return api.delete(`/customers/tag/${id}/`);
}
