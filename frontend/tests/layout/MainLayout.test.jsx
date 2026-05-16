import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import MainLayout from "../../src/layout/MainLayout.jsx";

vi.mock("../../src/layout/Header.jsx", () => ({
  default: () => <div>Header Stub</div>,
}));

vi.mock("../../src/layout/Sidebar.jsx", () => ({
  default: () => <div>Sidebar Stub</div>,
}));

describe("MainLayout", () => {
  it("renders header, sidebar and page content", () => {
    render(
      <MemoryRouter>
        <MainLayout>
          <div>Page Body</div>
        </MainLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("Header Stub")).toBeInTheDocument();
    expect(screen.getByText("Sidebar Stub")).toBeInTheDocument();
    expect(screen.getByText("Page Body")).toBeInTheDocument();
  });
});
