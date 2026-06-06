import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Sidebar from "../../src/layout/Sidebar.jsx";

const mockUseAuth = vi.fn();

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderSidebar(initialPath = "/customers") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { username: "admin", is_staff: true, role: "ADMIN" },
    });
  });

  it("renders core navigation items", () => {
    renderSidebar();

    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Payments")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("shows performance menu only for normal users", () => {
    mockUseAuth.mockReturnValue({
      user: { username: "user", is_staff: false, role: "USER" },
    });

    renderSidebar("/performance");

    const performanceLink = screen.getByRole("link", { name: /performansım/i });
    expect(performanceLink).toHaveAttribute("href", "/performance");
    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    expect(screen.queryByText("Payments")).not.toBeInTheDocument();
  });

  it("does not show performance menu for admin users", () => {
    renderSidebar();

    expect(screen.queryByText("Performansım")).not.toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });

  it("marks the current route as active", () => {
    renderSidebar("/products");

    const productsLink = screen.getByRole("link", { name: /products/i });
    expect(productsLink.className).toContain("active");
  });

  it("collapses and hides text labels when collapse button is clicked", async () => {
    const user = userEvent.setup();
    const { container } = renderSidebar();

    await user.click(container.querySelector(".collapse-btn"));

    expect(container.querySelector(".sidebar").className).toContain("collapsed");
    expect(screen.queryByText("Customers")).not.toBeInTheDocument();
  });
});
