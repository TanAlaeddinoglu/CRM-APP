import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("../../src/services/api", () => ({
  api: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
  },
}));

describe("export service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts export job creation to the correct endpoint", async () => {
    const { createExportJob } = await import("../../src/services/export.js");
    const payload = { model: "customer", file_type: "csv" };

    await createExportJob(payload);

    expect(mockPost).toHaveBeenCalledWith("/exports/", payload);
  });

  it("requests export history list with params", async () => {
    const { getExportHistory } = await import("../../src/services/export.js");

    await getExportHistory({ model: "events" });

    expect(mockGet).toHaveBeenCalledWith("/exports/", {
      params: { model: "events" },
    });
  });

  it("requests export history meta from the correct endpoint", async () => {
    const { getExportHistoryMeta } = await import("../../src/services/export.js");

    await getExportHistoryMeta();

    expect(mockGet).toHaveBeenCalledWith("/exports/meta/");
  });
});
