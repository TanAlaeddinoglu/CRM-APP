import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

import ProtectedRoute from "../../src/routes/ProtectedRoute.jsx";

const mockUseAuth = vi.fn();
const mockToastError = vi.fn();

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: (...args) => mockToastError(...args),
  },
}));

function renderRoute(ui, initialPath = "/exports/history") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/customers" element={<div>Customers Page</div>} />
        <Route path="/exports/history" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to login", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    renderRoute(
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("redirects non-staff users away from staff routes", () => {
    mockUseAuth.mockReturnValue({
      user: { username: "user", is_staff: false },
      loading: false,
    });

    renderRoute(
      <ProtectedRoute staffOnly>
        <div>Secret</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Customers Page")).toBeInTheDocument();
    expect(mockToastError).toHaveBeenCalledTimes(1);
  });

  it("renders children for authorized staff users", () => {
    mockUseAuth.mockReturnValue({
      user: { username: "admin", is_staff: true },
      loading: false,
    });

    renderRoute(
      <ProtectedRoute staffOnly>
        <div>Secret</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Secret")).toBeInTheDocument();
  });
});
