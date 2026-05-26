import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "../../src/pages/LoginPage.jsx";

const mockLogin = vi.fn();
const mockMe = vi.fn();
const mockGetCSRF = vi.fn();
const mockSetUser = vi.fn();
const mockToastError = vi.fn();

vi.mock("../../src/services/auth", () => ({
  login: (...args) => mockLogin(...args),
  me: (...args) => mockMe(...args),
  getCSRF: (...args) => mockGetCSRF(...args),
}));

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({ setUser: mockSetUser }),
}));

vi.mock("react-hot-toast", () => ({
  toast: {
    error: (...args) => mockToastError(...args),
  },
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCSRF.mockResolvedValue({});
  });

  it("prevents duplicate submit while login request is pending", async () => {
    const pendingLogin = deferred();
    const user = userEvent.setup();

    mockLogin.mockReturnValue(pendingLogin.promise);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Username"), "demo");
    await user.type(screen.getByPlaceholderText("Password"), "secret");

    const button = screen.getByRole("button", { name: "Login" });
    await user.click(button);
    await user.click(button);

    expect(mockLogin).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Logging in..." })
      ).toBeDisabled()
    );
  });
});
