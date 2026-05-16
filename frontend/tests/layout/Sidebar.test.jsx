import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import Sidebar from "../../src/layout/Sidebar.jsx";

function renderSidebar(initialPath = "/customers") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe("Sidebar", () => {
  it("renders core navigation items", () => {
    renderSidebar();

    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Payments")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
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
