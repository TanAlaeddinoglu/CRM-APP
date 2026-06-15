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

  it("falls back to anonymous state when profile request returns network error", async () => {
    window.history.pushState({}, "", "/dashboard");
    mockMe.mockRejectedValue(new Error("Network Error"))

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByText("loading:false")).toBeInTheDocument())
    // Bug: 401 and network error both set user to null — not distinguished
    expect(screen.getByText("user:none")).toBeInTheDocument()
  })

  it("exposes setUser so child components can update the authenticated user", async () => {
    window.history.pushState({}, "", "/customers")
    mockMe.mockResolvedValue({ data: { username: "admin" } })

    function SetUserProbe() {
      const { user, setUser } = useAuth()
      return (
        <div>
          <span>user:{user?.username || "none"}</span>
          <button onClick={() => setUser({ username: "updated" })}>Update</button>
        </div>
      )
    }

    const { getByText } = render(
      <AuthProvider>
        <SetUserProbe />
      </AuthProvider>
    )

    await waitFor(() => expect(getByText("user:admin")).toBeInTheDocument())
    getByText("Update").click()
    await waitFor(() => expect(getByText("user:updated")).toBeInTheDocument())
  })

  it("starts with loading:true before any fetch completes", () => {
    window.history.pushState({}, "", "/customers")
    mockMe.mockReturnValue(new Promise(() => {})) // never resolves

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    )

    expect(screen.getByText("loading:true")).toBeInTheDocument()
  })
});
