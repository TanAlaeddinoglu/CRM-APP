import React from "react";
import {
  CreditCard,
  Package,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ComposedChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

import { formatCurrency, formatPercent } from "../../utils/reportUtils";
import {
  ChartAxisTick,
  EmptyReportState,
  KpiGrid,
  ReportCard,
  SortableTableCard,
  TwoColumnGrid,
} from "./ReportUI";
import FilterBar from "../common/FilterBar.jsx";

const MAIN_CHART_HEIGHT = 300;
const SIDE_CHART_HEIGHT = 280;

const INFO_FILL = "#0f254f";

const PAYMENT_BALANCE_META = {
  tahsil_edilen: { label: "Tahsil Edilen", fill: "#16a34a", semantic: "success" },
  kalan:         { label: "Kalan",          fill: "#f59e0b", semantic: "warning" },
};

const PRODUCT_BREAKDOWN_COLUMNS = [
  { key: "product_name",               label: "Ürün",                  type: "text",   width: "18%", truncate: true },
  { key: "total_sales_appointments",   label: "Randevulu Satışlar",     type: "number", width: "15%", align: "right" },
  { key: "completed_appointments",     label: "Tamamlanan Satışlar",    type: "number", width: "16%", align: "right" },
  { key: "partial_appointments",       label: "Kısmi Satışlar",         type: "number", width: "13%", align: "right" },
  { key: "not_started_appointments",   label: "Ödemeye Başlanmadı",     type: "number", width: "16%", align: "right" },
  { key: "total_paid_amount",          label: "Toplam Gelir",           type: "number", width: "11%", align: "right", render: (row) => formatCurrency(row.total_paid_amount) },
  { key: "total_remaining_amount",     label: "Kalan Tutar",            type: "number", width: "11%", align: "right", render: (row) => formatCurrency(row.total_remaining_amount) },
];

export default function PaymentReportSection({
  filters,
  setFilters,
  report,
  loading,
  optionsLoading,
  userOptions,
  productOptions,
  onSubmit,
  onReset,
}) {
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateRangeChange = (key, from, to) => {
    setFilters((prev) => ({
      ...prev,
      preset: key === "custom" ? "" : key,
      date_from: from,
      date_to: to,
    }));
  };

  const totalPaidAmount      = Number(report?.summary?.total_paid_amount      || 0);
  const totalRemainingAmount = Number(report?.summary?.total_remaining_amount || 0);
  const totalExpectedAmount  = totalPaidAmount + totalRemainingAmount;

  const collectionRate =
    totalExpectedAmount > 0 ? (totalPaidAmount / totalExpectedAmount) * 100 : 0;

  const revenueChartData = [...(report?.charts?.revenue_by_product || [])]
    .sort((a, b) => Number(b.total_paid_amount || 0) - Number(a.total_paid_amount || 0));

  const paymentTrendData = (report?.charts?.payment_trend || []).map((item) => ({
    ...item,
    short_day: formatShortDate(item.day),
  }));

  const paidVsRemainingData = [
    {
      key: "tahsil_edilen",
      name: "Tahsil Edilen",
      value: totalPaidAmount,
      percent: totalExpectedAmount > 0 ? (totalPaidAmount / totalExpectedAmount) * 100 : 0,
    },
    {
      key: "kalan",
      name: "Kalan",
      value: totalRemainingAmount,
      percent: totalExpectedAmount > 0 ? (totalRemainingAmount / totalExpectedAmount) * 100 : 0,
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="reports-section-stack">
      <FilterBar.Panel title="Filtreler" onSubmit={onSubmit} onReset={onReset} loading={loading}>
        <FilterBar.Grid>
          <FilterBar.Select label="User" name="user_id" value={filters.user_id} onChange={handleFilterChange} options={userOptions} placeholder={optionsLoading ? "Yükleniyor..." : "Tümü"} />
          <FilterBar.Select label="Product" name="product_id" value={filters.product_id} onChange={handleFilterChange} options={productOptions} placeholder={optionsLoading ? "Yükleniyor..." : "Tümü"} />
          <FilterBar.DateRange label="Tarih Aralığı" value={filters.preset} onChange={handleDateRangeChange} />
        </FilterBar.Grid>
      </FilterBar.Panel>

      {!report ? (
        <EmptyReportState
          title="Henüz veri yok"
          description="Filtreleri seçip raporu getir."
          icon={<CreditCard size={22} />}
        />
      ) : (
        <div className="reports-section-stack">
          <KpiGrid
            items={[
              ["Randevulu Satışlar",    report.summary?.total_sales_appointments],
              ["Alınan Ödeme Sayısı",   report.summary?.total_payment_rows],
              ["Tamamlanan Satışlar",   report.summary?.completed_appointments],
              ["Kısmi Satışlar",        report.summary?.partial_appointments],
              ["Ödemeye Başlanmadı",    report.summary?.not_started_appointments],
              ["Tahsilat Oranı %",      collectionRate],
              ["Toplam Ciro",          totalPaidAmount],
              ["Açık Bakiye",           totalRemainingAmount],
            ]}
          />

          <SortableTableCard
            title={<SectionTitle icon={Package} title="Ürün Kırılımı" />}
            columns={PRODUCT_BREAKDOWN_COLUMNS}
            rows={report.tables?.product_breakdown || []}
            emptyText="Ödeme ürün kırılımı bulunamadı."
            defaultSort={{ key: "total_sales_appointments", direction: "desc" }}
            minWidth="980px"
            footer={
              <div className="reports-table-footer reports-table-footer--grid">
                <SummaryRow label="Toplam Satış Appointment"    value={report.summary?.total_sales_appointments} />
                <SummaryRow label="Toplam Alınan Ödeme Sayısı" value={report.summary?.total_payment_rows} />
                <SummaryRow label="Toplam Gelir"                value={formatCurrency(totalPaidAmount)} />
                <SummaryRow label="Toplam Kalan Tutar"          value={formatCurrency(totalRemainingAmount)} />
              </div>
            }
          />

          <ReportCard title={<SectionTitle icon={BarChart3} title="Ürüne Göre Gelir" />}>
            {revenueChartData.length === 0 ? (
              <EmptyChart text="Gelir verisi bulunamadı." />
            ) : (
              <div className="reports-chart-wrap" style={{ height: `${MAIN_CHART_HEIGHT}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
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
                      tickFormatter={(v) => compactCurrency(v)}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      width={64}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Bar dataKey="total_paid_amount" radius={[8, 8, 0, 0]} fill={INFO_FILL} barSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ReportCard>

          <TwoColumnGrid>
            <ReportCard title={<SectionTitle icon={PieChart} title="Tahsil Edilen / Kalan" />}>
              {paidVsRemainingData.length === 0 ? (
                <EmptyChart text="Tahsilat dağılımı verisi bulunamadı." />
              ) : (
                <div className="reports-pie-grid">
                  <div className="reports-chart-wrap" style={{ height: `${SIDE_CHART_HEIGHT}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={paidVsRemainingData}
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={108}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                          labelLine={false}
                        >
                          {paidVsRemainingData.map((entry) => (
                            <Cell key={entry.key} fill={PAYMENT_BALANCE_META[entry.key]?.fill || INFO_FILL} />
                          ))}
                        </Pie>
                        <Tooltip content={<PaidVsRemainingTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="reports-pie-legend">
                    {paidVsRemainingData.map((item) => (
                      <PaymentBalanceSummaryCard key={item.key} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </ReportCard>

            <ReportCard title={<SectionTitle icon={Activity} title="Ödeme Trendi" />}>
              {paymentTrendData.length === 0 ? (
                <EmptyChart text="Ödeme trend verisi bulunamadı." />
              ) : (
                <>
                  <div className="reports-chart-wrap" style={{ height: `${SIDE_CHART_HEIGHT}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={paymentTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                          dataKey="short_day"
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          axisLine={{ stroke: "#cbd5e1" }}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          width={52}
                          allowDecimals={false}
                          axisLine={{ stroke: "#cbd5e1" }}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(v) => compactCurrency(v)}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          width={70}
                          axisLine={{ stroke: "#cbd5e1" }}
                          tickLine={false}
                        />
                        <Tooltip content={<PaymentTrendTooltip />} />
                        <Bar yAxisId="left" dataKey="total_payment_rows" name="Alınan Ödeme Sayısı" fill="#cbd5e1" radius={[8, 8, 0, 0]} barSize={26} />
                        <Line yAxisId="right" type="linear" dataKey="total_paid_amount" name="Gelir" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: "#4f46e5" }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="reports-legend">
                    <LegendChip color="#cbd5e1" label="Alınan Ödeme Sayısı" />
                    <LegendChip color="#4f46e5" label="Gelir" />
                  </div>
                </>
              )}
            </ReportCard>
          </TwoColumnGrid>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="reports-section-title">
      <div className="reports-section-title__icon">
        {React.createElement(Icon, { size: 16 })}
      </div>
      <span className="reports-section-title__text">{title}</span>
    </div>
  );
}

function PaymentBalanceSummaryCard({ item }) {
  const meta = PAYMENT_BALANCE_META[item.key] || { fill: INFO_FILL, semantic: "info" };

  return (
    <div className={`reports-status-card reports-semantic--${meta.semantic}`}>
      <div className="reports-status-card__header">
        <span className="reports-status-dot" style={{ background: meta.fill }} />
        {item.name}
      </div>
      <div className="reports-status-card__meta">
        Oran: <strong>{formatPercent(item.percent)}</strong>
      </div>
      <div className="reports-status-card__meta reports-status-card__meta--plain">
        Tutar: <strong>{formatCurrency(item.value)}</strong>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="reports-summary-row">
      <span className="reports-summary-row__label">{label}</span>
      <strong className="reports-summary-row__value">{value ?? "-"}</strong>
    </div>
  );
}

function LegendChip({ color, label }) {
  return (
    <div className="reports-legend-chip">
      <span className="reports-legend-chip__dot" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function EmptyChart({ text }) {
  return <div className="reports-empty-chart">{text}</div>;
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="reports-tooltip-card">
      <div className="reports-tooltip-label">{row?.product_name || label}</div>
      <div className="reports-tooltip-text">Gelir: <strong>{formatCurrency(row?.total_paid_amount)}</strong></div>
    </div>
  );
}

function PaymentTrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="reports-tooltip-card">
      <div className="reports-tooltip-label">{row?.day || label}</div>
      <div className="reports-tooltip-text">Alınan Ödeme Sayısı: <strong>{row?.total_payment_rows ?? "-"}</strong></div>
      <div className="reports-tooltip-text">Gelir: <strong>{formatCurrency(row?.total_paid_amount)}</strong></div>
    </div>
  );
}

function PaidVsRemainingTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="reports-tooltip-card">
      <div className="reports-tooltip-label">{row?.name}</div>
      <div className="reports-tooltip-text">Oran: <strong>{formatPercent(row?.percent || 0)}</strong></div>
      <div className="reports-tooltip-text">Tutar: <strong>{formatCurrency(row?.value || 0)}</strong></div>
    </div>
  );
}

function formatShortDate(dateString) {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}.${parts[1]}`;
}

function compactCurrency(value) {
  const numeric = Number(value || 0);
  if (numeric >= 1_000_000) return `₺${(numeric / 1_000_000).toFixed(1)} Mn`;
  if (numeric >= 1_000)     return `₺${(numeric / 1_000).toFixed(numeric >= 10_000 ? 0 : 1)} B`;
  return `₺${numeric}`;
}
