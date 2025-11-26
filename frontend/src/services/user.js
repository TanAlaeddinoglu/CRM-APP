import { api } from "./api";

export function updateUser(userId, data) {
  return api.patch(`/accounts/users/${userId}/`, data);
}

export const getUsers = () => api.get("/accounts/users/");


export function createUser(data) {
  return api.post("/accounts/users/", data);
}
