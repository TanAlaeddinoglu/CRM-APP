import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "../../src/context/AuthContext.jsx";

const mockGetCSRF = vi.fn();
const mockMe = vi.fn();

vi.mock("../../src/services/auth", () => ({
  getCSRF: (...args) => mockGetCSRF(...args),
  me: (...args) => mockMe(...args),
}));

function AuthProbe() {
  const { user, loading } = useAuth();

  return (
    <div>
      <span>loading:{String(loading)}</span>
      <span>user:{user?.username || "none"}</span>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests csrf on login page instead of profile fetch", async () => {
    window.history.pushState({}, "", "/login");
    mockGetCSRF.mockResolvedValue({});

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByText("loading:false")).toBeInTheDocument()
    );
    expect(mockGetCSRF).toHaveBeenCalledTimes(1);
    expect(mockMe).not.toHaveBeenCalled();
    expect(screen.getByText("user:none")).toBeInTheDocument();
  });

  it("loads current user on protected pages", async () => {
    window.history.pushState({}, "", "/customers");
    mockMe.mockResolvedValue({ data: { username: "admin" } });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByText("user:admin")).toBeInTheDocument()
    );
    expect(mockMe).toHaveBeenCalledTimes(1);
    expect(mockGetCSRF).not.toHaveBeenCalled();
  });

  it("falls back to anonymous state when profile request fails", async () => {
    window.history.pushState({}, "", "/customers");
    mockMe.mockRejectedValue(new Error("unauthorized"));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByText("loading:false")).toBeInTheDocument()
    );
    expect(screen.getByText("user:none")).toBeInTheDocument();
  });
});
