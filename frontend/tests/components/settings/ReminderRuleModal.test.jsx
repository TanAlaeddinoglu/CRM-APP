import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NotificationRuleModal from "../../../src/components/settings/NotificationRuleModal.jsx";

const mockToastError = vi.fn();

vi.mock("react-hot-toast", () => ({
  toast: {
    error: (...args) => mockToastError(...args),
    success: vi.fn(),
  },
}));

const TYPES = [
  {
    key: "events.appointment_created",
    label: "Randevu oluşturuldu",
    category: "general",
    variables: [],
    default_title_template: "",
    default_body_template: "",
  },
];

const REMINDER_TYPES = [
  {
    key: "reminders.appointment_reminder",
    label: "Randevu hatırlatması",
    category: "reminder",
    variables: [{ key: "appointment_name", label: "Randevu adı" }],
    default_title_template: "Hatırlatma: {appointment_name}",
    default_body_template: "{appointment_name} — randevunuza {time_phrase}.",
  },
];

const CONDITION_FIELDS = [
  {
    name: "appointment_type",
    label: "Tür",
    choices: [
      { value: "hatirlatma", label: "Hatırlatma" },
      { value: "muayene", label: "Muayene" },
    ],
  },
  {
    name: "status",
    label: "Durum",
    choices: [{ value: "beklemede", label: "Beklemede" }],
  },
];

function renderModal(overrides = {}) {
  const onSave = vi.fn();
  const onSaveReminder = vi.fn();
  render(
    <NotificationRuleModal
      open
      types={[...TYPES, ...REMINDER_TYPES]}
      editingRule={null}
      editingReminder={null}
      conditionFields={CONDITION_FIELDS}
      activeChannelCode="in_app"
      reminderNotifRules={[]}
      onSave={onSave}
      onSaveReminder={onSaveReminder}
      onClose={vi.fn()}
      isSaving={false}
      {...overrides}
    />
  );
  return { onSave, onSaveReminder };
}

describe("NotificationRuleModal — Kural türü / Zamanlayıcı", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to normal mode showing Bildirim tipi", () => {
    renderModal();
    expect(screen.getByText("Bildirim tipi")).toBeInTheDocument();
    expect(screen.getByText("Kanallar")).toBeInTheDocument();
    expect(screen.queryByText("Hatırlatma zamanları")).not.toBeInTheDocument();
  });

  it("switches to timer fields when Zamanlayıcı is selected", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getAllByRole("combobox")[0], "timer");

    expect(screen.getByText("Koşullar")).toBeInTheDocument();
    expect(screen.getByText("Hatırlatma zamanları")).toBeInTheDocument();
    expect(screen.getByLabelText("Atanmış kullanıcıya gönder")).toBeInTheDocument();
    // Zamanlayıcı modunda tür seçici görünür
    expect(screen.getByText("Bildirim türü")).toBeInTheDocument();
    // Şablon adı input artık yok
    expect(screen.queryByPlaceholderText("Örn: Randevu Hatırlatması")).not.toBeInTheDocument();
  });

  it("submits a timer payload via onSaveReminder", async () => {
    const user = userEvent.setup();
    const { onSaveReminder } = renderModal();

    await user.selectOptions(screen.getAllByRole("combobox")[0], "timer");

    // Kural adı doldur
    await user.type(
      screen.getByPlaceholderText("Örn: Randevudan 1 gün önce hatırlat"),
      "1 gün önce"
    );

    // Koşul ekle → appointment_type = hatirlatma (varsayılan ilk değer)
    await user.click(screen.getByRole("button", { name: /Koşul ekle/ }));

    await user.click(screen.getByRole("button", { name: "Oluştur" }));

    await waitFor(() => expect(onSaveReminder).toHaveBeenCalledTimes(1));
    const payload = onSaveReminder.mock.calls[0][0];
    expect(payload.name).toBe("1 gün önce");
    expect(payload.notification_rule_id).toBeNull();
    // notification_rule_name otomatik olarak türün etiketinden atanır
    expect(payload.notification_rule_name).toBe("Randevu hatırlatması");
    expect(payload.channels).toEqual(["in_app"]);
    expect(payload.notify_assigned_user).toBe(true);
    expect(payload.conditions).toEqual([
      { field_name: "appointment_type", value: "hatirlatma" },
    ]);
    expect(payload.offsets).toEqual([
      { amount: 1, unit: "days", direction: "before" },
    ]);
  });

  it("rejects submit when kural adı is empty", async () => {
    const user = userEvent.setup();
    const { onSaveReminder } = renderModal();
    await user.selectOptions(screen.getAllByRole("combobox")[0], "timer");
    // Kural adı boş bırakıldı
    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    expect(onSaveReminder).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalled();
  });

  it("rejects submit with no recipient target", async () => {
    const user = userEvent.setup();
    const { onSaveReminder } = renderModal();
    await user.selectOptions(screen.getAllByRole("combobox")[0], "timer");

    await user.type(
      screen.getByPlaceholderText("Örn: Randevudan 1 gün önce hatırlat"),
      "Kural"
    );
    // İki alıcı checkbox'ını da kapat
    await user.click(screen.getByLabelText("Atanmış kullanıcıya gönder"));

    await user.click(screen.getByRole("button", { name: "Oluştur" }));
    expect(onSaveReminder).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalled();
  });

  it("shows reminder type selector in timer mode", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getAllByRole("combobox")[0], "timer");

    // Bildirim türü seçeneği görünür
    expect(screen.getByRole("option", { name: "Randevu hatırlatması" })).toBeInTheDocument();
  });

  it("opens directly in timer mode when defaultReminderNotifRule is set", () => {
    const notifRule = {
      id: 42,
      name: "Mevcut Şablon",
      type_key: "reminders.appointment_reminder",
      title_template: "Özel başlık",
      body_template: "Özel içerik",
    };
    renderModal({ defaultReminderNotifRule: notifRule });

    // Doğrudan zamanlayıcı alanları görünür — kural türü dropdown yok
    expect(screen.getByText("Hatırlatma zamanları")).toBeInTheDocument();
    expect(screen.queryByText("Kural türü")).not.toBeInTheDocument();
  });

  it("shows selected channels as acik and unselected as kapali in normal edit mode", () => {
    renderModal({
      editingRule: {
        id: 9,
        type_key: "events.appointment_created",
        name: "Normal kural",
        channels: ["email"],
        title_template: "Başlık",
        body_template: "İçerik",
        is_active: true,
        is_system_default: false,
      },
    });

    expect(screen.getByRole("checkbox", { name: /E-posta/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Uygulama İçi/i })).not.toBeChecked();
    expect(screen.getByText("E-posta").closest(".rrm-chip")).toHaveClass("active");
    expect(screen.getByText("Uygulama İçi").closest(".rrm-chip")).not.toHaveClass("active");
  });
});
