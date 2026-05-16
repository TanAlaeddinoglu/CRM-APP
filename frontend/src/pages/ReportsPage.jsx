import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  UserRound,
} from "lucide-react";

import { getUsers } from "../services/user";
import { getProducts } from "../services/product";
import {
  getAppointmentsSummary,
  getPaymentSummary,
  getProductPriceDistributionSummary,
  getUserDashboardSummary,
} from "../services/report";

import { TabButton } from "./ReportUI";
import UserReportSection from "./UserReportSection";
import AppointmentsReportSection from "./AppointmentsReportSection";
import PaymentReportSection from "./PaymentReportSection";
import ProductPriceDistributionReportSection from "../components/ProductPriceDistributionReportSection";
import {
  buildUserLabel,
  extractList,
  normalizeParams,
} from "./reportUtils";

const PRESET_OPTIONS = [
  { label: "7 Gün", value: "7" },
  { label: "14 Gün", value: "14" },
  { label: "30 Gün", value: "30" },
  { label: "60 Gün", value: "60" },
];

const initialUserFilters = {
  preset: "7",
  date_from: "",
  date_to: "",
  user_id: "",
};

const initialAppointmentFilters = {
  preset: "7",
  date_from: "",
  date_to: "",
  user_id: "",
  product_id: "",
};

const initialPaymentFilters = {
  preset: "7",
  date_from: "",
  date_to: "",
  user_id: "",
  product_id: "",
};

const initialPriceDistributionFilters = {
  preset: "7",
  date_from: "",
  date_to: "",
  user_id: "",
  product_id: "",
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("user");

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [userFilters, setUserFilters] = useState(initialUserFilters);
  const [appointmentFilters, setAppointmentFilters] = useState(
    initialAppointmentFilters
  );
  const [paymentFilters, setPaymentFilters] = useState(initialPaymentFilters);
  const [priceDistributionFilters, setPriceDistributionFilters] = useState(
    initialPriceDistributionFilters
  );

  const [userReport, setUserReport] = useState(null);
  const [appointmentsReport, setAppointmentsReport] = useState(null);
  const [paymentReport, setPaymentReport] = useState(null);
  const [priceDistributionReport, setPriceDistributionReport] = useState(null);

  const [userLoading, setUserLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [priceDistributionLoading, setPriceDistributionLoading] =
    useState(false);

  useEffect(() => {
    setOptionsLoading(true);

    Promise.all([getUsers(), getProducts()])
      .then(([usersRes, productsRes]) => {
        setUsers(extractList(usersRes.data));
        setProducts(extractList(productsRes.data));
      })
      .catch(() => {
        toast.error("Filtre verileri alınamadı.");
      })
      .finally(() => {
        setOptionsLoading(false);
      });
  }, []);

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: String(user.id),
        label: buildUserLabel(user),
      })),
    [users]
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.id),
        label: product.name,
      })),
    [products]
  );

  const resetUserReport = () => {
    setUserFilters(initialUserFilters);
    setUserReport(null);
  };

  const resetAppointmentsReport = () => {
    setAppointmentFilters(initialAppointmentFilters);
    setAppointmentsReport(null);
  };

  const resetPaymentReport = () => {
    setPaymentFilters(initialPaymentFilters);
    setPaymentReport(null);
  };

  const resetPriceDistributionReport = () => {
    setPriceDistributionFilters(initialPriceDistributionFilters);
    setPriceDistributionReport(null);
  };

  const submitUserReport = async () => {
    if (!userFilters.user_id) {
      toast.error("User seçimi zorunlu.");
      return;
    }

    setUserLoading(true);
    try {
      const params = normalizeParams(userFilters);
      const res = await getUserDashboardSummary(params);
      setUserReport(res.data);
      toast.success("Rapor getirildi.");
    } catch (error) {
      handleApiError(error);
    } finally {
      setUserLoading(false);
    }
  };

  const submitAppointmentsReport = async () => {
    setAppointmentsLoading(true);
    try {
      const params = normalizeParams(appointmentFilters);
      const res = await getAppointmentsSummary(params);
      setAppointmentsReport(res.data);
      toast.success("Rapor getirildi.");
    } catch (error) {
      handleApiError(error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const submitPaymentReport = async () => {
    setPaymentLoading(true);
    try {
      const params = normalizeParams(paymentFilters);
      const res = await getPaymentSummary(params);
      setPaymentReport(res.data);
      toast.success("Rapor getirildi.");
    } catch (error) {
      handleApiError(error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const submitPriceDistributionReport = async () => {
    setPriceDistributionLoading(true);
    try {
      const params = normalizeParams(priceDistributionFilters);
      const res = await getProductPriceDistributionSummary(params);
      setPriceDistributionReport(res.data);
      toast.success("Rapor getirildi.");
    } catch (error) {
      handleApiError(error);
    } finally {
      setPriceDistributionLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gap: "18px",
        paddingBottom: "32px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <h1 className="h1" style={{ margin: 0 }}>
          Reports
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          background: "#ffffff",
          padding: "12px",
          borderRadius: "18px",
          border: "1px solid #e6edf5",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
        }}
      >
        <TabButton
          active={activeTab === "user"}
          onClick={() => setActiveTab("user")}
          label="User Report"
          icon={UserRound}
        />
        <TabButton
          active={activeTab === "appointments"}
          onClick={() => setActiveTab("appointments")}
          label="Appointments Report"
          icon={CalendarDays}
        />
        <TabButton
          active={activeTab === "payment"}
          onClick={() => setActiveTab("payment")}
          label="Payment Report"
          icon={CreditCard}
        />
        <TabButton
          active={activeTab === "priceDistribution"}
          onClick={() => setActiveTab("priceDistribution")}
          label="Product Price Distribution"
          icon={BarChart3}
        />
      </div>

      {activeTab === "user" && (
        <UserReportSection
          filters={userFilters}
          setFilters={setUserFilters}
          report={userReport}
          loading={userLoading}
          optionsLoading={optionsLoading}
          userOptions={userOptions}
          presetOptions={PRESET_OPTIONS}
          onSubmit={submitUserReport}
          onReset={resetUserReport}
        />
      )}

      {activeTab === "appointments" && (
        <AppointmentsReportSection
          filters={appointmentFilters}
          setFilters={setAppointmentFilters}
          report={appointmentsReport}
          loading={appointmentsLoading}
          optionsLoading={optionsLoading}
          userOptions={userOptions}
          productOptions={productOptions}
          presetOptions={PRESET_OPTIONS}
          onSubmit={submitAppointmentsReport}
          onReset={resetAppointmentsReport}
        />
      )}

      {activeTab === "payment" && (
        <PaymentReportSection
          filters={paymentFilters}
          setFilters={setPaymentFilters}
          report={paymentReport}
          loading={paymentLoading}
          optionsLoading={optionsLoading}
          userOptions={userOptions}
          productOptions={productOptions}
          presetOptions={PRESET_OPTIONS}
          onSubmit={submitPaymentReport}
          onReset={resetPaymentReport}
        />
      )}

      {activeTab === "priceDistribution" && (
        <ProductPriceDistributionReportSection
          filters={priceDistributionFilters}
          setFilters={setPriceDistributionFilters}
          report={priceDistributionReport}
          loading={priceDistributionLoading}
          optionsLoading={optionsLoading}
          userOptions={userOptions}
          productOptions={productOptions}
          presetOptions={PRESET_OPTIONS}
          onSubmit={submitPriceDistributionReport}
          onReset={resetPriceDistributionReport}
        />
      )}
    </div>
  );
}

function handleApiError(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    toast.error(data.detail);
    return;
  }

  if (typeof data === "object" && data !== null) {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue) && firstValue[0]) {
      toast.error(firstValue[0]);
      return;
    }
  }

  toast.error("Bir hata oluştu.");
}