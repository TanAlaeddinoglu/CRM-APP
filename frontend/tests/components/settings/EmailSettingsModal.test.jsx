import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EmailSettingsModal from "../../../src/components/settings/EmailSettingsModal.jsx";

const mockGetEmailConfiguration = vi.fn();
const mockTestEmailConfiguration = vi.fn();
const mockSaveEmailConfiguration = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("../../../src/services/emailSettings.js", () => ({
  getEmailConfiguration: (...args) => mockGetEmailConfiguration(...args),
  testEmailConfiguration: (...args) => mockTestEmailConfiguration(...args),
  saveEmailConfiguration: (...args) => mockSaveEmailConfiguration(...args),
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

describe("EmailSettingsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEmailConfiguration.mockResolvedValue({ data: { configuration: null } });
  });

  it("loads existing configuration when opened", async () => {
    mockGetEmailConfiguration.mockResolvedValue({
      data: {
        configuration: {
          host: "smtp.example.com",
          port: 2525,
          default_from_email: "crm@example.com",
        },
      },
    });

    render(<EmailSettingsModal open onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(await screen.findByDisplayValue("smtp.example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2525")).toBeInTheDocument();
    expect(screen.getByDisplayValue("crm@example.com")).toBeInTheDocument();
  });

  it("validates required fields before testing", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <EmailSettingsModal open onClose={vi.fn()} onSaved={vi.fn()} />
    );

    await screen.findByText("Mail Ayarları");
    await user.clear(container.querySelector('input[name="host"]'));
    await user.click(screen.getByRole("button", { name: "Test Et" }));

    expect(mockToastError).toHaveBeenCalledWith("Host alanı zorunlu.");
    expect(mockTestEmailConfiguration).not.toHaveBeenCalled();
  });

  it("tests and saves configuration successfully", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();

    mockTestEmailConfiguration.mockResolvedValue({
      data: { test_session_id: 44 },
    });
    mockSaveEmailConfiguration.mockResolvedValue({ data: {} });

    const { container } = render(
      <EmailSettingsModal open onClose={onClose} onSaved={onSaved} />
    );

    await screen.findByText("Mail Ayarları");
    await user.clear(container.querySelector('input[name="hostUser"]'));
    await user.type(
      container.querySelector('input[name="hostUser"]'),
      "mailer@example.com"
    );
    await user.type(
      container.querySelector('input[name="hostPassword"]'),
      "super-secret"
    );

    await user.click(screen.getByRole("button", { name: "Test Et" }));

    await waitFor(() =>
      expect(mockTestEmailConfiguration).toHaveBeenCalledWith({
        name: "Primary SMTP",
        host: "smtp.mail.example.com",
        port: 587,
        host_user: "mailer@example.com",
        host_password: "super-secret",
        default_from_email: "crm@example.com",
        use_tls: true,
        use_ssl: false,
      })
    );

    expect(mockToastSuccess).toHaveBeenCalledWith("Mail ayarları test edildi.");

    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    await user.click(screen.getByRole("button", { name: "Evet, Kaydet" }));

    await waitFor(() =>
      expect(mockSaveEmailConfiguration).toHaveBeenCalledWith({
        name: "Primary SMTP",
        host: "smtp.mail.example.com",
        port: 587,
        host_user: "mailer@example.com",
        host_password: "super-secret",
        default_from_email: "crm@example.com",
        use_tls: true,
        use_ssl: false,
        test_session_id: 44,
      })
    );

    expect(mockToastSuccess).toHaveBeenCalledWith("Mail ayarları kaydedildi.");
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows user-friendly error on test failure", async () => {
    const user = userEvent.setup();
    mockTestEmailConfiguration.mockRejectedValue({
      response: { data: { detail: "SMTP auth failed: raw backend log" } },
    });

    const { container } = render(
      <EmailSettingsModal open onClose={vi.fn()} onSaved={vi.fn()} />
    );

    await screen.findByText("Mail Ayarları");
    await user.clear(container.querySelector('input[name="hostUser"]'));
    await user.type(
      container.querySelector('input[name="hostUser"]'),
      "mailer@example.com"
    );
    await user.type(
      container.querySelector('input[name="hostPassword"]'),
      "super-secret"
    );
    await user.click(screen.getByRole("button", { name: "Test Et" }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Mail ayarları test edilemedi. Bilgileri kontrol edip tekrar deneyin."
      )
    );
  });

  it("shows user-friendly error on save failure", async () => {
    const user = userEvent.setup();
    mockTestEmailConfiguration.mockResolvedValue({
      data: { test_session_id: 55 },
    });
    mockSaveEmailConfiguration.mockRejectedValue({
      response: { data: { detail: "Secret store failed: raw backend log" } },
    });

    const { container } = render(
      <EmailSettingsModal open onClose={vi.fn()} onSaved={vi.fn()} />
    );

    await screen.findByText("Mail Ayarları");
    await user.clear(container.querySelector('input[name="hostUser"]'));
    await user.type(
      container.querySelector('input[name="hostUser"]'),
      "mailer@example.com"
    );
    await user.type(
      container.querySelector('input[name="hostPassword"]'),
      "super-secret"
    );
    await user.click(screen.getByRole("button", { name: "Test Et" }));
    await waitFor(() => expect(mockTestEmailConfiguration).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    await user.click(screen.getByRole("button", { name: "Evet, Kaydet" }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Mail ayarları kaydedilemedi. Testi yeniden çalıştırıp tekrar deneyin."
      )
    );
  });
});
