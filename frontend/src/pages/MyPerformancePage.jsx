import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  CalendarCheck,
  PieChart as PieChartIcon,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getMyPerformanceReport } from "../services/report";
import {
  ChartAxisTick,
  ChartWhenVisible,
  EmptyChart,
  EmptyReportState,
  KpiGrid,
  ReportCard,
  SectionTitle,
  TwoColumnGrid,
} from "../components/reports/ReportUI";
import FilterBar from "../components/common/FilterBar.jsx";
import PageCard from "../components/common/PageCard.jsx";
import { usePageTransition } from "../context/PageTransitionContext.jsx";
import { normalizeParams, formatShortDate, formatPercent } from "../utils/reportUtils";
import "../assets/css/reports.css";

const PRESET_OPTIONS = [
  { label: "Son 7 Gün", value: "7" },
  { label: "Son 14 Gün", value: "14" },
  { label: "Son 30 Gün", value: "30" },
  { label: "Son 60 Gün", value: "60" },
];

const initialFilters = {
  preset: "7",
  date_from: "",
  date_to: "",
};

const MAIN_CHART_HEIGHT = 300;
const SIDE_CHART_HEIGHT = 280;
const NAVY = "#0f254f";
const SALES_COLOR = "#16a34a";
const STATUS_COLORS = {
  Beklemede: "#f59e0b",
  Satış: "#16a34a",
  Olumsuz: "#dc2626",
};
const STATUS_META = {
  Beklemede: {
    fill: "#f59e0b",
    bg: "#fef3c7",
    border: "#fcd34d",
    text: "#92400e",
  },
  Satış: {
    fill: "#16a34a",
    bg: "#dcfce7",
    border: "#86efac",
    text: "#166534",
  },
  Olumsuz: {
    fill: "#dc2626",
    bg: "#fee2e2",
    border: "#fca5a5",
    text: "#991b1b",
  },
};

export default function MyPerformancePage() {
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  usePageTransition(loading);

  const appointmentByDayData = useMemo(
    () =>
      (report?.appointment_by_day || []).map((item) => ({
        ...item,
        short_date: formatShortDate(item.date),
      })),
    [report]
  );

  const salesByProductData = useMemo(
    () => report?.sales_by_product || [],
    [report]
  );

  const statusDistributionData = useMemo(
    () => {
      const rows = (report?.appointment_status_distribution || []).filter(
        (item) => Number(item.count || 0) > 0
      );
      const total = rows.reduce((sum, item) => sum + Number(item.count || 0), 0);

      return rows.map((item) => ({
        ...item,
        percent: total ? roundPercent((Number(item.count || 0) / total) * 100) : 0,
      }));
    },
    [report]
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "preset" && value) {
        next.date_from = "";
        next.date_to = "";
      }

      if ((name === "date_from" || name === "date_to") && value) {
        next.preset = "";
      }

      return next;
    });
  };

  const fetchReport = useCallback(async (nextFilters) => {
    setLoading(true);
    try {
      const res = await getMyPerformanceReport(normalizeParams(nextFilters));
      setReport(res.data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(initialFilters);
  }, [fetchReport]);

  const resetReport = () => {
    setFilters(initialFilters);
    fetchReport(initialFilters);
  };

  return (
    <PageCard>
    <div className="reports-page">
      <div className="reports-page__header">
        <h1 className="h1 reports-page__title">Performansım</h1>
      </div>

      <FilterBar.Panel title="Tarih Aralığı" onSubmit={() => fetchReport(filters)} onReset={resetReport} loading={loading}>
        <FilterBar.Grid>
          <FilterBar.Select label="Önerilen Aralık" name="preset" value={filters.preset} onChange={handleFilterChange} options={PRESET_OPTIONS} placeholder="Özel tarih aralığı" />
          <FilterBar.DateInput label="Başlangıç Tarihi" name="date_from" value={filters.date_from} onChange={handleFilterChange} />
          <FilterBar.DateInput label="Bitiş Tarihi" name="date_to" value={filters.date_to} onChange={handleFilterChange} />
        </FilterBar.Grid>
      </FilterBar.Panel>

      {!report ? (
        <EmptyReportState
          title="Henüz veri yok"
          description="Seçilen tarih aralığı için performans verin burada görünecek."
          icon={<Activity size={22} />}
        />
      ) : (
        <div className="reports-section-stack">
          <KpiGrid
            items={[
              ["Aktif Müşteri", report.summary?.active_data],
              ["Toplam Randevu", report.summary?.total_appointments],
              [
                "Günlük Ortalama Randevu",
                report.summary?.daily_average_appointments,
              ],
              ["Beklemede", report.summary?.pending],
              ["Satış", report.summary?.sales],
              ["Olumsuz", report.summary?.negative],
              ["Dönüşüm %", report.summary?.conversion_rate],
              ["Ret %", report.summary?.rejection_rate],
            ]}
          />

          <TopProductCard products={report.top_products} />

          <ReportCard
            title={
              <SectionTitle
                icon={CalendarCheck}
                title="Günlere Göre Alınan Randevu Sayısı"
              />
            }
          >
            {appointmentByDayData.length === 0 ? (
              <EmptyChart text="Bu dönemde alınan randevu bulunamadı." />
            ) : (
              <ChartWhenVisible height={MAIN_CHART_HEIGHT}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={appointmentByDayData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e5e7eb"
                    />
                    <XAxis
                      dataKey="short_date"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip content={<AppointmentByDayTooltip />} />
                    <Bar
                      dataKey="count"
                      fill={NAVY}
                      radius={[8, 8, 0, 0]}
                      barSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWhenVisible>
            )}
          </ReportCard>

          <TwoColumnGrid>
            <ReportCard
              title={<SectionTitle icon={ShoppingBag} title="Ürüne Göre Satış" />}
            >
              {salesByProductData.length === 0 ? (
                <EmptyChart text="Ürün bazlı satış verisi bulunamadı." />
              ) : (
                <ChartWhenVisible height={SIDE_CHART_HEIGHT}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesByProductData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e5e7eb"
                      />
                      <XAxis
                        dataKey="product_name"
                        tick={<ChartAxisTick />}
                        tickMargin={10}
                        interval={0}
                        height={52}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        width={40}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={false}
                      />
                      <Tooltip content={<ProductTooltip />} />
                      <Bar
                        dataKey="count"
                        fill={SALES_COLOR}
                        radius={[8, 8, 0, 0]}
                        barSize={34}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWhenVisible>
              )}
            </ReportCard>

            <ReportCard
              title={
                <SectionTitle icon={PieChartIcon} title="Randevu Durumları" />
              }
            >
              {statusDistributionData.length === 0 ? (
                <EmptyChart text="Bu dönem için randevu durumu bulunamadı." />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 220px)",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <ChartWhenVisible height={SIDE_CHART_HEIGHT}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistributionData}
                          cx="50%"
                          cy="50%"
                          dataKey="count"
                          nameKey="status"
                          innerRadius={72}
                          outerRadius={108}
                          paddingAngle={4}
                          labelLine={false}
                        >
                          {statusDistributionData.map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={STATUS_COLORS[entry.status] || NAVY}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<StatusTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartWhenVisible>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {statusDistributionData.map((item) => (
                      <StatusSummaryCard key={item.status} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </ReportCard>
          </TwoColumnGrid>
        </div>
      )}
    </div>
    </PageCard>
  );
}

function TopProductCard({ topProduct }) {
  const hasProduct = !!topProduct?.product_name;

  return (
    <ReportCard title={<SectionTitle icon={Trophy} title="En Çok Sattığın Ürün" />}>
      {hasProduct ? (
        <div
          style={{
            display: "grid",
            gap: "12px",
            padding: "16px",
            border: "1px solid #eef2f7",
            borderRadius: "16px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "#0f172a",
              wordBreak: "break-word",
            }}
          >
            {topProduct.product_name}
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "fit-content",
              minWidth: "88px",
              height: "34px",
              borderRadius: "999px",
              background: NAVY,
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              padding: "0 12px",
            }}
          >
            Satış: {topProduct.count ?? 0}
          </div>
        </div>
      ) : (
        <EmptyChart text="Bu dönemde satış bulunamadı." />
      )}
    </ReportCard>
  );
}

function StatusSummaryCard({ item }) {
  const meta = STATUS_META[item.status] || {
    fill: NAVY,
    bg: "#eef5ff",
    border: "#c7d7f3",
    text: NAVY,
  };

  return (
    <div
      style={{
        border: `1px solid ${meta.border}`,
        borderRadius: "14px",
        padding: "12px 14px",
        background: meta.bg,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
          fontSize: "14px",
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "999px",
            background: meta.fill,
            display: "inline-block",
          }}
        />
        {item.status}
      </div>

      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
        Oran: <strong style={{ color: meta.text }}>{formatPercent(item.percent)}</strong>
      </div>

      <div style={{ fontSize: "13px", color: "#64748b" }}>
        Adet: <strong style={{ color: "#0f172a" }}>{item.count}</strong>
      </div>
    </div>
  );
}

function AppointmentByDayTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.date || label}</div>
      <div style={tooltipTextStyle}>
        Alınan Randevu Sayısı: <strong>{row?.count ?? "-"}</strong>
      </div>
    </TooltipCard>
  );
}

function ProductTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.product_name || label}</div>
      <div style={tooltipTextStyle}>
        Satış: <strong>{row?.count ?? "-"}</strong>
      </div>
    </TooltipCard>
  );
}

function StatusTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.status}</div>
      <div style={tooltipTextStyle}>
        Adet: <strong>{row?.count ?? "-"}</strong>
      </div>
    </TooltipCard>
  );
}

function TooltipCard({ children }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "10px 12px",
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
      }}
    >
      {children}
    </div>
  );
}

function roundPercent(value) {
  return Math.round(value * 100) / 100;
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

  toast.error("Performans raporu alınamadı.");
}

const tooltipLabelStyle = {
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "6px",
};

const tooltipTextStyle = {
  fontSize: "13px",
  color: "#0f172a",
};
