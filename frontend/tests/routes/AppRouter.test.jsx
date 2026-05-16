import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import AppRouter from "../../src/routes/AppRouter.jsx";

vi.mock("../../src/routes/ProtectedRoute.jsx", () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock("../../src/layout/MainLayout.jsx", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../../src/pages/LoginPage", () => ({
  default: () => <div>Login Page</div>,
}));
vi.mock("../../src/pages/Dashboard", () => ({
  default: () => <div>Dashboard Page</div>,
}));
vi.mock("../../src/pages/ProfilePage.jsx", () => ({
  default: () => <div>Profile Page</div>,
}));
vi.mock("../../src/pages/ProductsPage.jsx", () => ({
  default: () => <div>Products Page</div>,
}));
vi.mock("../../src/pages/AppointmentsPage.jsx", () => ({
  default: () => <div>Appointments Page</div>,
}));
vi.mock("../../src/pages/AppointmentHistoryPage.jsx", () => ({
  default: () => <div>Appointment History Page</div>,
}));
vi.mock("../../src/pages/CustomerDetailPage.jsx", () => ({
  default: () => <div>Customer Detail Page</div>,
}));
vi.mock("../../src/pages/CustomerPage.jsx", () => ({
  default: ({ archiveOnly }) => (
    <div>{archiveOnly ? "Customer Archive Page" : "Customer List Page"}</div>
  ),
}));
vi.mock("../../src/pages/TagPage.jsx", () => ({
  default: () => <div>Tag Page</div>,
}));
vi.mock("../../src/pages/PaymentPage.jsx", () => ({
  default: () => <div>Payment Page</div>,
}));
vi.mock("../../src/components/payment/PaymentHistoryPage.jsx", () => ({
  default: () => <div>Payment History Page</div>,
}));
vi.mock("../../src/pages/ExportHistoryPage.jsx", () => ({
  default: () => <div>Export History Page</div>,
}));

function renderRouter(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>
  );
}

describe("AppRouter", () => {
  it("renders login route", async () => {
    renderRouter("/login");
    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  it("renders export history route", async () => {
    renderRouter("/exports/history");
    expect(await screen.findByText("Export History Page")).toBeInTheDocument();
  });

  it("renders customer archive route with archive flag", async () => {
    renderRouter("/customers/archive");
    expect(await screen.findByText("Customer Archive Page")).toBeInTheDocument();
  });
});
