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
  FilterGrid,
  FilterPanel,
  InputField,
  KpiGrid,
  ReportCard,
  SelectField,
  SortableReportTable,
  TwoColumnGrid,
} from "./ReportUI";

const MAIN_CHART_HEIGHT = 300;
const SIDE_CHART_HEIGHT = 280;

const SEMANTIC_STYLES = {
  success: {
    fill: "#16a34a",
    bg: "#dcfce7",
    border: "#86efac",
    text: "#166534",
  },
  warning: {
    fill: "#f59e0b",
    bg: "#fef3c7",
    border: "#fcd34d",
    text: "#92400e",
  },
  info: {
    fill: "#0f254f",
    bg: "#eef5ff",
    border: "#c7d7f3",
    text: "#0f254f",
  },
};

const PAYMENT_BALANCE_META = {
  tahsil_edilen: {
    label: "Tahsil Edilen",
    ...SEMANTIC_STYLES.success,
  },
  kalan: {
    label: "Kalan",
    ...SEMANTIC_STYLES.warning,
  },
};

const PRODUCT_BREAKDOWN_COLUMNS = [
  {
    key: "product_name",
    label: "Ürün",
    type: "text",
    width: "18%",
    truncate: true,
  },
  {
    key: "total_sales_appointments",
    label: "Randevulu Satışlar",
    type: "number",
    width: "15%",
    align: "right",
  },
  {
    key: "completed_appointments",
    label: "Tamamlanan Satışlar",
    type: "number",
    width: "16%",
    align: "right",
  },
  {
    key: "partial_appointments",
    label: "Kısmi Satışlar",
    type: "number",
    width: "13%",
    align: "right",
  },
  {
    key: "not_started_appointments",
    label: "Ödemeye Başlanmadı",
    type: "number",
    width: "16%",
    align: "right",
  },
  {
    key: "total_paid_amount",
    label: "Toplam Gelir",
    type: "number",
    width: "11%",
    align: "right",
    render: (row) => formatCurrency(row.total_paid_amount),
  },
  {
    key: "total_remaining_amount",
    label: "Kalan Tutar",
    type: "number",
    width: "11%",
    align: "right",
    render: (row) => formatCurrency(row.total_remaining_amount),
  },
];

export default function PaymentReportSection({
  filters,
  setFilters,
  report,
  loading,
  optionsLoading,
  userOptions,
  productOptions,
  presetOptions,
  onSubmit,
  onReset,
}) {
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

  const totalPaidAmount = Number(report?.summary?.total_paid_amount || 0);
  const totalRemainingAmount = Number(report?.summary?.total_remaining_amount || 0);
  const totalExpectedAmount = totalPaidAmount + totalRemainingAmount;

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
      percent:
        totalExpectedAmount > 0 ? (totalRemainingAmount / totalExpectedAmount) * 100 : 0,
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="reports-section-stack">
      <FilterPanel
        title="Filtreler"
        onSubmit={onSubmit}
        onReset={onReset}
        loading={loading}
      >
        <FilterGrid>
          <SelectField
            label="User"
            name="user_id"
            value={filters.user_id}
            onChange={handleFilterChange}
            options={userOptions}
            placeholder={optionsLoading ? "Yükleniyor..." : "Tümü"}
          />

          <SelectField
            label="Product"
            name="product_id"
            value={filters.product_id}
            onChange={handleFilterChange}
            options={productOptions}
            placeholder={optionsLoading ? "Yükleniyor..." : "Tümü"}
          />

          <SelectField
            label="Önerilen Aralık"
            name="preset"
            value={filters.preset}
            onChange={handleFilterChange}
            options={presetOptions}
            placeholder="Aralık seç"
          />

          <InputField
            label="Başlangıç Tarihi"
            name="date_from"
            type="date"
            value={filters.date_from}
            onChange={handleFilterChange}
          />

          <InputField
            label="Bitiş Tarihi"
            name="date_to"
            type="date"
            value={filters.date_to}
            onChange={handleFilterChange}
          />
        </FilterGrid>
      </FilterPanel>

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
              ["Randevulu Satışlar", report.summary?.total_sales_appointments],
              ["Alınan Ödeme Sayısı", report.summary?.total_payment_rows],
              ["Tamamlanan Satışlar", report.summary?.completed_appointments],
              ["Kısmi Satışlar", report.summary?.partial_appointments],
              ["Ödemeye Başlanmadı", report.summary?.not_started_appointments],
              ["Tahsilat Oranı %", collectionRate],
              ["Toplam Gelir", totalPaidAmount],
              ["Kalan Tutar", totalRemainingAmount],
            ]}
          />

          <ReportCard title={<SectionTitle icon={Package} title="Ürün Kırılımı" />}>
            <SortableReportTable
              columns={PRODUCT_BREAKDOWN_COLUMNS}
              rows={report.tables?.product_breakdown || []}
              emptyText="Ödeme ürün kırılımı bulunamadı."
              defaultSort={{ key: "total_sales_appointments", direction: "desc" }}
              minWidth="980px"
            />

            <div
              style={{
                marginTop: "14px",
                paddingTop: "12px",
                borderTop: "1px solid #eef2f7",
                display: "grid",
                gap: "8px",
              }}
            >
              <SummaryRow
                label="Toplam Satış Appointment"
                value={report.summary?.total_sales_appointments}
              />
              <SummaryRow
                label="Toplam Alınan Ödeme Sayısı"
                value={report.summary?.total_payment_rows}
              />
              <SummaryRow label="Toplam Gelir" value={formatCurrency(totalPaidAmount)} />
              <SummaryRow
                label="Toplam Kalan Tutar"
                value={formatCurrency(totalRemainingAmount)}
              />
            </div>
          </ReportCard>

          <ReportCard title={<SectionTitle icon={BarChart3} title="Ürüne Göre Gelir" />}>
            {revenueChartData.length === 0 ? (
              <EmptyChartState text="Gelir verisi bulunamadı." />
            ) : (
              <div style={{ width: "100%", height: `${MAIN_CHART_HEIGHT}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueChartData}
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
                      tickFormatter={(value) => compactCurrency(value)}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      width={64}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Bar
                      dataKey="total_paid_amount"
                      radius={[8, 8, 0, 0]}
                      fill={SEMANTIC_STYLES.info.fill}
                      barSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ReportCard>

          <TwoColumnGrid>
            <ReportCard title={<SectionTitle icon={PieChart} title="Tahsil Edilen / Kalan" />}>
              {paidVsRemainingData.length === 0 ? (
                <EmptyChartState text="Tahsilat dağılımı verisi bulunamadı." />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 220px)",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ width: "100%", height: `${SIDE_CHART_HEIGHT}px` }}>
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
                            <Cell
                              key={entry.key}
                              fill={PAYMENT_BALANCE_META[entry.key]?.fill || SEMANTIC_STYLES.info.fill}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PaidVsRemainingTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {paidVsRemainingData.map((item) => (
                      <PaymentBalanceSummaryCard key={item.key} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </ReportCard>

            <ReportCard title={<SectionTitle icon={Activity} title="Ödeme Trendi" />}>
              {paymentTrendData.length === 0 ? (
                <EmptyChartState text="Ödeme trend verisi bulunamadı." />
              ) : (
                <>
                  <div style={{ width: "100%", height: `${SIDE_CHART_HEIGHT}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={paymentTrendData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e5e7eb"
                        />
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
                          tickFormatter={(value) => compactCurrency(value)}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          width={70}
                          axisLine={{ stroke: "#cbd5e1" }}
                          tickLine={false}
                        />
                        <Tooltip content={<PaymentTrendTooltip />} />
                        <Bar
                          yAxisId="left"
                          dataKey="total_payment_rows"
                          name="Alınan Ödeme Sayısı"
                          fill="#cbd5e1"
                          radius={[8, 8, 0, 0]}
                          barSize={26}
                        />
                        <Line
                          yAxisId="right"
                          type="linear"
                          dataKey="total_paid_amount"
                          name="Gelir"
                          stroke="#4f46e5"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#4f46e5" }}
                          activeDot={{ r: 6 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      gap: "16px",
                      flexWrap: "wrap",
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
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
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "10px",
          background: SEMANTIC_STYLES.info.bg,
          border: `1px solid ${SEMANTIC_STYLES.info.border}`,
          display: "grid",
          placeItems: "center",
          color: SEMANTIC_STYLES.info.text,
          flexShrink: 0,
        }}
      >
        {React.createElement(Icon, { size: 16 })}
      </div>

      <span
        style={{
          fontSize: "16px",
          fontWeight: 800,
          color: "#0f172a",
          lineHeight: 1.2,
        }}
      >
        {title}
      </span>
    </div>
  );
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.product_name || label}</div>
      <div style={tooltipTextStyle}>
        Gelir: <strong>{formatCurrency(row?.total_paid_amount)}</strong>
      </div>
    </TooltipCard>
  );
}

function PaymentTrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.day || label}</div>
      <div style={tooltipTextStyle}>
        Alınan Ödeme Sayısı: <strong>{row?.total_payment_rows ?? "-"}</strong>
      </div>
      <div style={tooltipTextStyle}>
        Gelir: <strong>{formatCurrency(row?.total_paid_amount)}</strong>
      </div>
    </TooltipCard>
  );
}

function PaidVsRemainingTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.name}</div>
      <div style={tooltipTextStyle}>
        Oran: <strong>{formatPercent(row?.percent || 0)}</strong>
      </div>
      <div style={tooltipTextStyle}>
        Tutar: <strong>{formatCurrency(row?.value || 0)}</strong>
      </div>
    </TooltipCard>
  );
}

function PaymentBalanceSummaryCard({ item }) {
  const meta = PAYMENT_BALANCE_META[item.key] || SEMANTIC_STYLES.info;

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
        {item.name}
      </div>

      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
        Oran: <strong style={{ color: meta.text }}>{formatPercent(item.percent)}</strong>
      </div>

      <div style={{ fontSize: "13px", color: "#64748b" }}>
        Tutar: <strong style={{ color: "#0f172a" }}>{formatCurrency(item.value)}</strong>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        fontSize: "14px",
      }}
    >
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong style={{ color: "#0f172a" }}>{value ?? "-"}</strong>
    </div>
  );
}

function LegendChip({ color, label }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "4px",
          background: color,
          display: "inline-block",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function EmptyChartState({ text }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px dashed #d6e0ea",
        borderRadius: "14px",
        padding: "18px",
        color: "#64748b",
        fontSize: "14px",
      }}
    >
      {text}
    </div>
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

function formatShortDate(dateString) {
  if (!dateString) return "-";

  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;

  return `${parts[2]}.${parts[1]}`;
}

function compactCurrency(value) {
  const numeric = Number(value || 0);

  if (numeric >= 1_000_000) {
    return `₺${(numeric / 1_000_000).toFixed(1)} Mn`;
  }

  if (numeric >= 1_000) {
    return `₺${(numeric / 1_000).toFixed(numeric >= 10_000 ? 0 : 1)} B`;
  }

  return `₺${numeric}`;
}

const tooltipLabelStyle = {
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "6px",
};

const tooltipTextStyle = {
  fontSize: "13px",
  color: "#0f172a",
  marginBottom: "4px",
};
