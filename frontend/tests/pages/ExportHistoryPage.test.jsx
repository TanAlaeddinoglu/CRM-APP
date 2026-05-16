import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ExportHistoryPage from "../../src/pages/ExportHistoryPage.jsx";
import {
  getExportHistory,
  getExportHistoryMeta,
} from "../../src/services/export";

vi.mock("../../src/services/export", () => ({
  EXPORT_HISTORY_CACHE_KEY: "export-history-cache-v1",
  clearExportHistoryCache: vi.fn(() =>
    sessionStorage.removeItem("export-history-cache-v1")
  ),
  ensureExportHistoryCacheExpiry: vi.fn(),
  getExportHistory: vi.fn(),
  getExportHistoryMeta: vi.fn(),
  scheduleExportHistoryCacheExpiry: vi.fn((expiresAt) => {
    const delay = Math.max(0, expiresAt - Date.now());
    window.setTimeout(() => {
      sessionStorage.removeItem("export-history-cache-v1");
    }, delay);
  }),
}));

function buildJob(id, overrides = {}) {
  return {
    id,
    created_by: `admin${id}`,
    model_name: "customer",
    file_type: "csv",
    selected_fields: ["customer_name"],
    recipient_email: `admin${id}@example.com`,
    email_subject: "",
    email_body: "",
    status: "completed",
    file_status: "created",
    email_status: "sent",
    row_count: id,
    file_name: "",
    relative_path: "",
    absolute_path: "",
    workflow_task_id: "",
    email_log: null,
    metadata: {},
    error_message: "",
    created_at: `2026-05-${String((id % 28) + 1).padStart(2, "0")}T10:00:00Z`,
    updated_at: `2026-05-${String((id % 28) + 1).padStart(2, "0")}T10:05:00Z`,
    ...overrides,
  };
}

function setDocumentVisible() {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
}

describe("ExportHistoryPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setDocumentVisible();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters locally without issuing a second history request", async () => {
    const jobs = [
      buildJob(1, { model_name: "customer" }),
      buildJob(2, { model_name: "events" }),
    ];

    getExportHistory.mockResolvedValue({ data: jobs });
    getExportHistoryMeta.mockResolvedValue({
      data: { count: 2, latest_updated_at: jobs[1].updated_at },
    });

    const user = userEvent.setup();
    render(<ExportHistoryPage />);

    await screen.findByText("2 kayit gosteriliyor");
    expect(getExportHistory).toHaveBeenCalledTimes(1);

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "events");

    await screen.findByText("1 kayit gosteriliyor");
    expect(screen.getByText("Job #2")).toBeInTheDocument();
    expect(screen.queryByText("Job #1")).not.toBeInTheDocument();
    expect(getExportHistory).toHaveBeenCalledTimes(1);
  });

  it("supports pagination and page size changes", async () => {
    const jobs = Array.from({ length: 25 }, (_, index) =>
      buildJob(index + 1, {
        model_name: index >= 20 ? "events" : "customer",
      })
    );

    getExportHistory.mockResolvedValue({ data: jobs });
    getExportHistoryMeta.mockResolvedValue({
      data: { count: 25, latest_updated_at: jobs[24].updated_at },
    });

    const user = userEvent.setup();
    render(<ExportHistoryPage />);

    await screen.findByText("25 kayit gosteriliyor");
    expect(screen.getByText("Job #20")).toBeInTheDocument();
    expect(screen.queryByText("Job #21")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /sonraki/i }));
    expect(await screen.findByText("Job #21")).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[1], "50");

    await screen.findByText("Sayfa 1 / 1");
    expect(screen.getByText("Job #21")).toBeInTheDocument();
  });

  it("uses session cache and skips the initial full history request", async () => {
    const jobs = [buildJob(1)];
    const meta = { count: 1, latest_updated_at: jobs[0].updated_at };

    sessionStorage.setItem(
      "export-history-cache-v1",
      JSON.stringify({
        jobs,
        meta,
        expires_at: Date.now() + 60_000,
      })
    );

    getExportHistoryMeta.mockResolvedValue({ data: meta });

    render(<ExportHistoryPage />);

    await screen.findByText("1 kayit gosteriliyor");
    expect(getExportHistory).not.toHaveBeenCalled();
    expect(getExportHistoryMeta).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Job #1")).toBeInTheDocument();
  });

  it("removes cached history from session storage after ttl expires", async () => {
    vi.useFakeTimers();

    const jobs = [buildJob(1)];
    getExportHistory.mockResolvedValue({ data: jobs });
    getExportHistoryMeta.mockResolvedValue({
      data: { count: 1, latest_updated_at: jobs[0].updated_at },
    });

    render(<ExportHistoryPage />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(sessionStorage.getItem("export-history-cache-v1")).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    expect(sessionStorage.getItem("export-history-cache-v1")).toBeNull();
  });

  it("runs a full refresh on every third poll interval", async () => {
    vi.useFakeTimers();

    const jobs = [buildJob(1), buildJob(2)];
    const meta = { count: 2, latest_updated_at: jobs[1].updated_at };

    getExportHistory.mockResolvedValue({ data: jobs });
    getExportHistoryMeta.mockResolvedValue({ data: meta });

    render(<ExportHistoryPage />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getExportHistory).toHaveBeenCalledTimes(1);
    expect(getExportHistoryMeta).toHaveBeenCalledTimes(0);
    expect(screen.getByText("2 kayit gosteriliyor")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100_000);
    });
    expect(getExportHistoryMeta).toHaveBeenCalledTimes(1);
    expect(getExportHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100_000);
    });
    expect(getExportHistoryMeta).toHaveBeenCalledTimes(2);
    expect(getExportHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100_000);
    });
    expect(getExportHistory).toHaveBeenCalledTimes(2);
    expect(getExportHistoryMeta).toHaveBeenCalledTimes(2);
  });
});
