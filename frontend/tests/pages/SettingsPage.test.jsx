import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SettingsPage from "../../src/pages/SettingsPage.jsx";

const mockUseAuth = vi.fn();

vi.mock("../../src/context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../src/components/settings/SecuritySettings.jsx", () => ({
  default: () => <div>Security Settings Panel</div>,
}));

vi.mock("../../src/components/settings/NotificationSettings.jsx", () => ({
  default: () => <div>Notification Settings Panel</div>,
}));

vi.mock("../../src/components/settings/IntegrationSettings.jsx", () => ({
  default: () => <div>Integration Settings Panel</div>,
}));

describe("SettingsPage", () => {
  it("shows only security settings to non-admin users", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "USER", is_staff: false },
    });

    render(<SettingsPage />);

    expect(screen.getByRole("button", { name: "Güvenlik" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bildirim" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Entegrasyon" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Security Settings Panel")).toBeInTheDocument();
  });

  it("shows notification and integration settings to admins", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "ADMIN", is_staff: true },
    });

    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: "Bildirim" }));
    expect(screen.getByText("Notification Settings Panel")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Entegrasyon" }));
    expect(screen.getByText("Integration Settings Panel")).toBeInTheDocument();
  });
});
