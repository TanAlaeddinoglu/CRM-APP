import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IntegrationSettings from "../../../src/components/settings/IntegrationSettings.jsx";

const mockGetEmailConfiguration = vi.fn();
const mockResetEmailConfiguration = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("../../../src/components/settings/EmailSettingsModal.jsx", () => ({
  default: ({ open }) => (open ? <div>Mail Modal Mock</div> : null),
}));

vi.mock("../../../src/services/emailSettings.js", () => ({
  getEmailConfiguration: (...args) => mockGetEmailConfiguration(...args),
  resetEmailConfiguration: (...args) => mockResetEmailConfiguration(...args),
  getEmailSettingsErrorMessage: (action) => {
    const messages = {
      load: "Mail ayarları yüklenemedi.",
      test: "Mail ayarları test edilemedi. Bilgileri kontrol edip tekrar deneyin.",
      save: "Mail ayarları kaydedilemedi. Testi yeniden çalıştırıp tekrar deneyin.",
      reset: "Mail ayarları sıfırlanamadı.",
    };
    return messages[action];
  },
}));

vi.mock("react-hot-toast", () => ({
  toast: {
    error: (...args) => mockToastError(...args),
    success: (...args) => mockToastSuccess(...args),
  },
}));

describe("IntegrationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active configuration state", async () => {
    mockGetEmailConfiguration.mockResolvedValue({
      data: {
        configuration: {
          host: "smtp.example.com",
          port: 587,
        },
      },
    });

    render(<IntegrationSettings />);

    expect(
      await screen.findByText("smtp.example.com:587 üzerinden gönderim yapılıyor.")
    ).toBeInTheDocument();
    expect(screen.getByText("Bağlı")).toBeInTheDocument();
  });

  it("opens configuration modal", async () => {
    const user = userEvent.setup();
    mockGetEmailConfiguration.mockResolvedValue({
      data: { configuration: null },
    });

    render(<IntegrationSettings />);

    await user.click(await screen.findByRole("button", { name: /Konfigürasyon/i }));

    expect(screen.getByText("Mail Modal Mock")).toBeInTheDocument();
  });

  it("resets configuration successfully", async () => {
    const user = userEvent.setup();
    mockGetEmailConfiguration.mockResolvedValue({
      data: {
        configuration: {
          host: "smtp.example.com",
          port: 587,
        },
      },
    });
    mockResetEmailConfiguration.mockResolvedValue({ data: {} });

    render(<IntegrationSettings />);

    await user.click(await screen.findByRole("button", { name: "Mail ayarlarını sıfırla" }));
    await user.click(screen.getByRole("button", { name: "Evet, Sıfırla" }));

    await waitFor(() => expect(mockResetEmailConfiguration).toHaveBeenCalledTimes(1));
    expect(mockToastSuccess).toHaveBeenCalledWith("Mail konfigürasyonu sıfırlandı.");
    expect(
      screen.getByText("Henüz kayıtlı bir mail konfigürasyonu bulunmuyor.")
    ).toBeInTheDocument();
  });

  it("shows user-friendly error when reset fails", async () => {
    const user = userEvent.setup();
    mockGetEmailConfiguration.mockResolvedValue({
      data: {
        configuration: {
          host: "smtp.example.com",
          port: 587,
        },
      },
    });
    mockResetEmailConfiguration.mockRejectedValue({
      response: { data: { detail: "vault delete failed: raw backend log" } },
    });

    render(<IntegrationSettings />);

    await user.click(await screen.findByRole("button", { name: "Mail ayarlarını sıfırla" }));
    await user.click(screen.getByRole("button", { name: "Evet, Sıfırla" }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Mail ayarları sıfırlanamadı.")
    );
  });
});
