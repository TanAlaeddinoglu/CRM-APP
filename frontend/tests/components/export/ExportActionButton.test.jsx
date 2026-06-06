import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExportActionButton from "../../../src/components/export/ExportActionButton.jsx";

const mockCreateExportJob = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("../../../src/services/export", () => ({
  createExportJob: (...args) => mockCreateExportJob(...args),
}));

vi.mock("react-hot-toast", () => ({
  toast: {
    error: (...args) => mockToastError(...args),
    success: (...args) => mockToastSuccess(...args),
  },
}));

describe("ExportActionButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens export modal for supported models", async () => {
    const user = userEvent.setup();
    render(<ExportActionButton model="customer" />);

    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(screen.getByText("Müşteri Export")).toBeInTheDocument();
    expect(screen.getByText("Alanlar")).toBeInTheDocument();
  });

  it("shows error toast for unsupported models", async () => {
    const user = userEvent.setup();
    render(<ExportActionButton model="unsupported-model" />);

    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(
      "Bu sayfa için export konfigürasyonu bulunamadı."
    );
  });

  it("submits export job and notifies caller", async () => {
    const onQueued = vi.fn();
    const user = userEvent.setup();

    mockCreateExportJob.mockResolvedValue({
      data: { job_id: 42 },
    });

    render(
      <ExportActionButton
        model="customer"
        initialRecipientEmail="admin@example.com"
        onQueued={onQueued}
      />
    );

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Export Başlat" }));

    await waitFor(() => expect(mockCreateExportJob).toHaveBeenCalledTimes(1));
    expect(mockCreateExportJob).toHaveBeenCalledWith({
      model: "customer",
      file_type: "excel",
      fields: [
        "customer_name",
        "customer_surname",
        "customer_email",
        "customer_phone",
        "status",
        "assigned_to",
        "tag",
        "created_at",
      ],
      recipient_email: "admin@example.com",
    });
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    expect(onQueued).toHaveBeenCalledWith({ job_id: 42 });
  });
});
