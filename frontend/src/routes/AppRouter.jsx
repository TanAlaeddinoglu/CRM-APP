// src/routes/AppRouter.jsx
import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

import ProtectedRoute from "./ProtectedRoute.jsx";
import MainLayout from "../layout/MainLayout";
import LoginPage from "../pages/LoginPage";

/* =========================
   LAZY LOADED PAGES
========================= */
const Dashboard = lazy(() => import("../pages/Dashboard"));
const ProfilePage = lazy(() => import("../pages/ProfilePage.jsx"));
const ProductsPage = lazy(() => import("../pages/ProductsPage.jsx"));
const AppointmentsPage = lazy(() => import("../pages/AppointmentsPage.jsx"));
const AppointmentHistoryPage = lazy(() =>
  import("../pages/AppointmentHistoryPage.jsx")
);
const CustomerDetailPage = lazy(() =>
  import("../pages/CustomerDetailPage.jsx")
);
const CustomerListPage = lazy(() =>
  import("../pages/CustomerPage.jsx")
);
const TagPage = lazy(() => import("../pages/TagPage.jsx"));
const PaymentPage = lazy(() => import("../pages/PaymentPage.jsx"));
const PaymentHistoryPage = lazy(() =>
  import("../components/payment/PaymentHistoryPage.jsx")
);
const ReportsPage = lazy(() => import("../pages/reports/ReportsPage.jsx"));
const ExportHistoryPage = lazy(() =>
  import("../pages/ExportHistoryPage.jsx")
);

/* =========================
   LOADER
========================= */
function PageLoader() {
  return (
    <div style={{ padding: "32px", textAlign: "center" }}>
      Yükleniyor…
    </div>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      {/* ================= LOGIN ================= */}
      <Route path="/login" element={<LoginPage />} />

      {/* ================= DASHBOARD ================= */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= PROFILE ================= */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= PRODUCTS ================= */}
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <ProductsPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= APPOINTMENTS (CALENDAR) ================= */}
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <AppointmentsPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= APPOINTMENT HISTORY (ADMIN) ================= */}
      <Route
        path="/appointments/history"
        element={
          <ProtectedRoute staffOnly>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <AppointmentHistoryPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= CUSTOMERS ================= */}
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <CustomerListPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers/archive"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <CustomerListPage archiveOnly />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <CustomerDetailPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= TAGS ================= */}
      <Route
        path="/tags"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <TagPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= PAYMENTS (ADMIN) ================= */}
      <Route
        path="/payments"
        element={
          <ProtectedRoute staffOnly>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <PaymentPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments/history"
        element={
          <ProtectedRoute staffOnly>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <PaymentHistoryPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= REPORTS (ADMIN) ================= */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute staffOnly>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <ReportsPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= EXPORTS (ADMIN) ================= */}
      <Route
        path="/exports/history"
        element={
          <ProtectedRoute staffOnly>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <ExportHistoryPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
