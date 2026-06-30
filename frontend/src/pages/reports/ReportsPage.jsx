import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Tag,
  UserRound,
} from "lucide-react";

import { getUsers } from "../../services/user";
import { getProducts } from "../../services/product";
import {
  getAppointmentsSummary,
  getPaymentSummary,
  getProductPriceDistributionSummary,
  getUserDashboardSummary,
} from "../../services/report";

import { TabButton } from "../../components/reports/ReportUI";
import UserReportSection from "../../components/reports/UserReportSection";
import AppointmentsReportSection from "../../components/reports/AppointmentsReportSection";
import PaymentReportSection from "../../components/reports/PaymentReportSection";
import ProductPriceDistributionReportSection from "../../components/reports/ProductPriceDistributionReportSection";
import TagStatisticsReportSection from "../../components/reports/TagStatisticsReportSection";
import { usePageTransition } from "../../context/PageTransitionContext.jsx";
import PageCard from "../../components/common/PageCard.jsx";
import {
  buildUserLabel,
  extractList,
  normalizeParams,
} from "../../utils/reportUtils";
import "../../assets/css/reports.css";


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
  usePageTransition(
    optionsLoading ||
      userLoading ||
      appointmentsLoading ||
      paymentLoading ||
      priceDistributionLoading
  );

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
      users
        .filter((user) => user.is_active)
        .map((user) => ({
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
      toast.error("Kullanıcı seçimi zorunludur.");
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
    <PageCard>
    <div className="reports-page">
      <div className="reports-page__header">
        <h1 className="h1 reports-page__title">
          Raporlar
        </h1>
      </div>

      <div className="reports-tabs">
        <TabButton
          active={activeTab === "user"}
          onClick={() => setActiveTab("user")}
          label="Kullanıcı Raporu"
          icon={UserRound}
        />
        <TabButton
          active={activeTab === "appointments"}
          onClick={() => setActiveTab("appointments")}
          label="Randevu Raporu"
          icon={CalendarDays}
        />
        <TabButton
          active={activeTab === "payment"}
          onClick={() => setActiveTab("payment")}
          label="Ödeme Raporu"
          icon={CreditCard}
        />
        <TabButton
          active={activeTab === "priceDistribution"}
          onClick={() => setActiveTab("priceDistribution")}
          label="Ürün Fiyat Dağılımı"
          icon={BarChart3}
        />
        <TabButton
          active={activeTab === "tagStatistics"}
          onClick={() => setActiveTab("tagStatistics")}
          label="Etiket İstatistikleri"
          icon={Tag}
        />
      </div>

      <div key={activeTab} className="reports-tab-content">
        {activeTab === "user" && (
          <UserReportSection
            filters={userFilters}
            setFilters={setUserFilters}
            report={userReport}
            loading={userLoading}
            optionsLoading={optionsLoading}
            userOptions={userOptions}

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

            onSubmit={submitPriceDistributionReport}
            onReset={resetPriceDistributionReport}
          />
        )}

        {activeTab === "tagStatistics" && (
          <TagStatisticsReportSection
            userOptions={userOptions}
            optionsLoading={optionsLoading}
          />
        )}
      </div>
    </div>
    </PageCard>
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
