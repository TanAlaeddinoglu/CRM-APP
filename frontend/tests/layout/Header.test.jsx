import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Header from "../../src/layout/Header.jsx";

const mockNavigate = vi.fn();
const mockSetUser = vi.fn();
const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
const mockClearExportHistoryCache = vi.fn();

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../src/services/auth", () => ({
  logout: () => mockLogout(),
}));

vi.mock("../../src/services/export", () => ({
  clearExportHistoryCache: () => mockClearExportHistoryCache(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../src/layout/HeaderCustomerSearch", () => ({
  default: () => <div>Search Stub</div>,
}));

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  it("shows Export History in dropdown for staff users", async () => {
    mockUseAuth.mockReturnValue({
      user: { username: "admin", role: "ADMIN", is_staff: true },
      setUser: mockSetUser,
    });

    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: "⋮" }));

    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Export History")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("hides Export History in dropdown for regular users", async () => {
    mockUseAuth.mockReturnValue({
      user: { username: "user", role: "USER", is_staff: false },
      setUser: mockSetUser,
    });

    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: "⋮" }));

    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.queryByText("Export History")).not.toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("logs out and redirects to login", async () => {
    mockUseAuth.mockReturnValue({
      user: { username: "admin", role: "ADMIN", is_staff: true },
      setUser: mockSetUser,
    });

    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: "⋮" }));
    await user.click(screen.getByText("Logout"));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockClearExportHistoryCache).toHaveBeenCalledTimes(1);
    expect(mockSetUser).toHaveBeenCalledWith(null);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
