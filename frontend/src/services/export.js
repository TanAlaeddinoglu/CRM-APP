import { api } from "./api";

export const createExportJob = (payload) => api.post("/exports/", payload);
