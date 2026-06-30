import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NotificationSettings from "../../../src/components/settings/NotificationSettings.jsx";

const mockGetNotificationTypes = vi.fn();
const mockGetNotificationRules = vi.fn();
const mockUpdateNotificationRule = vi.fn();
const mockGetReminderRules = vi.fn();
const mockGetReminderConditionFields = vi.fn();
const mockGetEmailConfiguration = vi.fn();
const mockUpdateReminderRule = vi.fn();

vi.mock("../../../src/services/notifications.js", () => ({
  getNotificationTypes: (...a) => mockGetNotificationTypes(...a),
  getNotificationRules: (...a) => mockGetNotificationRules(...a),
  createNotificationRule: vi.fn(),
  updateNotificationRule: (...a) => mockUpdateNotificationRule(...a),
  deleteNotificationRule: vi.fn(),
  getNotificationError: () => "hata",
}));

vi.mock("../../../src/services/reminders.js", () => ({
  getReminderRules: (...a) => mockGetReminderRules(...a),
  getReminderConditionFields: (...a) => mockGetReminderConditionFields(...a),
  createReminderRule: vi.fn(),
  updateReminderRule: (...a) => mockUpdateReminderRule(...a),
  deleteReminderRule: vi.fn(),
  getReminderError: () => "hata",
}));

vi.mock("../../../src/services/emailSettings.js", () => ({
  getEmailConfiguration: (...a) => mockGetEmailConfiguration(...a),
}));

vi.mock("react-hot-toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("NotificationSettings — Zamanlayıcı grubu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotificationTypes.mockResolvedValue({ data: [] });
    mockGetNotificationRules.mockResolvedValue({ data: [] });
    mockUpdateNotificationRule.mockResolvedValue({ data: {} });
    mockGetReminderConditionFields.mockResolvedValue({ data: [] });
    mockGetEmailConfiguration.mockResolvedValue({ data: { configuration: {} } });
    mockUpdateReminderRule.mockResolvedValue({ data: {} });
  });

  it("shows normal rules on both channel tabs and marks missing channel as closed", async () => {
    const user = userEvent.setup();
    mockGetNotificationRules.mockResolvedValue({
      data: [
        {
          id: 3,
          type_key: "events.appointment_created",
          name: "Normal kural",
          channels: ["in_app"],
          is_active: true,
          is_system_default: false,
        },
      ],
    });
    mockGetReminderRules.mockResolvedValue({ data: [] });

    render(<NotificationSettings />);

    expect(await screen.findByText("Normal kural")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /E-posta Bildirimleri/i }));

    const row = screen.getByText("Normal kural").closest(".settings-rule-row");
    expect(row).not.toBeNull();
    expect(within(row).getByRole("button", { name: "Kapalı" })).toHaveClass("active");
  });

  it("renders the timer-rules group with reminder rules", async () => {
    mockGetReminderRules.mockResolvedValue({
      data: [
        {
          id: 7,
          name: "1 gün önce hatırlat",
          is_active: true,
          channels: ["in_app"],
          notify_assigned_user: true,
          notify_admins: false,
          conditions: [{ field_name: "appointment_type", value: "hatirlatma" }],
          offsets: [{ amount: 1, unit: "days", direction: "before" }],
        },
      ],
    });

    render(<NotificationSettings />);

    expect(
      await screen.findByText("Zamanlayıcı (Hatırlatma) Kuralları")
    ).toBeInTheDocument();
    expect(screen.getByText("1 gün önce hatırlat")).toBeInTheDocument();
    expect(screen.getByText("1 koşul · 1 hatırlatma")).toBeInTheDocument();
  });

  it("shows reminder rule as closed on email tab when email channel is not selected", async () => {
    const user = userEvent.setup();
    mockGetReminderRules.mockResolvedValue({
      data: [
        {
          id: 7,
          name: "1 gün önce hatırlat",
          is_active: true,
          channels: ["in_app"],
          notify_assigned_user: true,
          notify_admins: false,
          conditions: [{ field_name: "appointment_type", value: "hatirlatma" }],
          offsets: [{ amount: 1, unit: "days", direction: "before" }],
        },
      ],
    });

    render(<NotificationSettings />);

    await user.click(await screen.findByRole("button", { name: /E-posta Bildirimleri/i }));

    const row = screen.getByText("1 gün önce hatırlat").closest(".settings-rule-row");
    expect(row).not.toBeNull();
    expect(within(row).getByRole("button", { name: "Kapalı" })).toHaveClass("active");
  });

  it("asks which channels to close and updates reminder rule accordingly", async () => {
    const user = userEvent.setup();
    mockGetReminderRules.mockResolvedValue({
      data: [
        {
          id: 12,
          name: "Çift kanal hatırlatma",
          is_active: true,
          channels: ["in_app", "email"],
          notify_assigned_user: true,
          notify_admins: false,
          conditions: [],
          offsets: [{ amount: 1, unit: "days", direction: "before" }],
        },
      ],
    });

    render(<NotificationSettings />);

    const row = (await screen.findByText("Çift kanal hatırlatma")).closest(".settings-rule-row");
    expect(row).not.toBeNull();
    await user.click(within(row).getByRole("button", { name: "Kapalı" }));
    await user.click(screen.getByRole("radio", { name: /E-posta/i }));
    await user.click(screen.getByRole("button", { name: "Kapat" }));

    await waitFor(() =>
      expect(mockUpdateReminderRule).toHaveBeenCalledWith(12, {
        channels: ["in_app"],
        is_active: true,
      })
    );
  });

  it("channel card toggle removes that channel from all rules", async () => {
    const user = userEvent.setup();
    mockGetNotificationRules.mockResolvedValue({
      data: [
        {
          id: 21,
          type_key: "events.appointment_created",
          name: "Normal kural",
          channels: ["in_app", "email"],
          is_active: true,
          is_system_default: false,
        },
      ],
    });
    mockGetReminderRules.mockResolvedValue({
      data: [
        {
          id: 22,
          name: "Reminder kural",
          channels: ["email"],
          is_active: true,
          notify_assigned_user: true,
          notify_admins: false,
          conditions: [],
          offsets: [{ amount: 1, unit: "days", direction: "before" }],
        },
      ],
    });

    render(<NotificationSettings />);

    const emailCard = await screen.findByRole("button", { name: /E-posta Bildirimleri/i });
    const emailRow = emailCard.closest(".settings-select-row");
    expect(emailRow).not.toBeNull();
    await user.click(emailCard);
    await user.click(within(emailRow).getByRole("button", { name: "Kapalı" }));
    await user.click(screen.getByRole("button", { name: "Evet, Kapat" }));

    await waitFor(() => {
      expect(mockUpdateNotificationRule).toHaveBeenCalledWith(21, {
        channels: ["in_app"],
        is_active: true,
      });
      expect(mockUpdateReminderRule).toHaveBeenCalledWith(22, {
        channels: [],
        is_active: false,
      });
    });
  });
});
