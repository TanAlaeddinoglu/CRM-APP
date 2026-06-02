import React from "react";
import {
  CalendarDays,
  Package,
  UserRound,
  Activity,
  PieChart,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { formatPercent } from "../../utils/reportUtils";
import {
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

const CHART_HEIGHT = 280;

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
  danger: {
    fill: "#dc2626",
    bg: "#fee2e2",
    border: "#fca5a5",
    text: "#991b1b",
  },
  info: {
    fill: "#0f254f",
    bg: "#eef5ff",
    border: "#c7d7f3",
    text: "#0f254f",
  },
};

const STATUS_META = {
  Beklemede: {
    semantic: "warning",
    fill: SEMANTIC_STYLES.warning.fill,
  },
  Satış: {
    semantic: "success",
    fill: SEMANTIC_STYLES.success.fill,
  },
  Olumsuz: {
    semantic: "danger",
    fill: SEMANTIC_STYLES.danger.fill,
  },
};

const USER_PERFORMANCE_COLUMNS = [
  { key: "username", label: "User", type: "text", width: "24%", truncate: true },
  { key: "total", label: "Toplam Randevu", type: "number", width: "19%" },
  { key: "pending", label: "Beklemede", type: "number", width: "16%" },
  { key: "sales", label: "Satış", type: "number", width: "12%" },
  { key: "negative", label: "Olumsuz", type: "number", width: "13%" },
  {
    key: "sales_rate",
    label: "Satış %",
    type: "number",
    width: "16%",
    render: (row) => <RateBadge value={row.sales_rate} />,
  },
];

const PRODUCT_BREAKDOWN_COLUMNS = [
  {
    key: "product_name",
    label: "Ürün",
    type: "text",
    width: "24%",
    truncate: true,
  },
  { key: "total", label: "Toplam", type: "number", width: "14%" },
  { key: "pending", label: "Beklemede", type: "number", width: "16%" },
  { key: "sales", label: "Satış", type: "number", width: "12%" },
  { key: "negative", label: "Olumsuz", type: "number", width: "14%" },
  {
    key: "sales_rate",
    label: "Satış %",
    type: "number",
    width: "20%",
    render: (row) => <RateProgress value={row.sales_rate} />,
  },
];

export default function AppointmentsReportSection({
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

  const trendData = (report?.charts?.trend || []).map((item) => ({
    ...item,
    short_day: formatShortDate(item.day),
  }));

  const totalAppointments = Number(report?.summary?.total_appointments || 0);

  const statusDistributionData = report
    ? [
        {
          name: "Beklemede",
          value: Number(report.summary?.pending_appointments || 0),
        },
        {
          name: "Satış",
          value: Number(report.summary?.sales_appointments || 0),
        },
        {
          name: "Olumsuz",
          value: Number(report.summary?.negative_appointments || 0),
        },
      ]
        .filter((item) => item.value > 0)
        .map((item) => ({
          ...item,
          percent: totalAppointments > 0 ? (item.value / totalAppointments) * 100 : 0,
        }))
    : [];

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
          icon={<CalendarDays size={22} />}
        />
      ) : (
        <div className="reports-section-stack">
          <KpiGrid
            items={[
              ["Toplam Randevu", report.summary?.total_appointments],
              ["Beklemede", report.summary?.pending_appointments],
              ["Satış", report.summary?.sales_appointments],
              ["Olumsuz", report.summary?.negative_appointments],
              ["Satış %", report.summary?.sales_rate],
              ["Beklemede %", report.summary?.pending_rate],
              ["Olumsuz %", report.summary?.negative_rate],
            ]}
          />

          <TwoColumnGrid>
            <ReportCard
              title={<SectionTitle icon={Package} title="Ürün Kırılımı" />}
            >
              <AppointmentsBreakdownTable
                rows={report.tables?.product_breakdown || []}
                emptyText="Ürün kırılımı bulunamadı."
              />

              <div
                style={{
                  marginTop: "14px",
                  paddingTop: "12px",
                  borderTop: "1px solid #eef2f7",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "#64748b" }}>Toplam Randevu</span>
                <strong style={{ color: "#0f172a" }}>
                  {report.summary?.total_appointments ?? "-"}
                </strong>
              </div>
            </ReportCard>

            <ReportCard
              title={<SectionTitle icon={UserRound} title="Kullanıcı Performansı" />}
            >
              <UserPerformanceTable
                rows={report.tables?.user_performance || []}
                emptyText="Kullanıcı performans verisi bulunamadı."
              />
            </ReportCard>
          </TwoColumnGrid>

          <TwoColumnGrid>
            <ReportCard title={<SectionTitle icon={Activity} title="Trend" />}>
              {trendData.length === 0 ? (
                <EmptyTableLike text="Trend verisi bulunamadı." />
              ) : (
                <div style={{ width: "100%", height: `${CHART_HEIGHT}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={trendData}
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
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        allowDecimals={false}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip content={<TrendTooltip />} />
                      <Bar
                        dataKey="total"
                        name="Toplam Randevu"
                        fill="#cbd5e1"
                        radius={[8, 8, 0, 0]}
                        barSize={34}
                      />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        name="Satış"
                        stroke={SEMANTIC_STYLES.info.fill}
                        strokeWidth={3}
                        dot={{ r: 4, fill: SEMANTIC_STYLES.info.fill }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {trendData.length > 0 && (
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
                  <LegendChip color="#cbd5e1" label="Toplam Randevu" />
                  <LegendChip color={SEMANTIC_STYLES.info.fill} label="Satış" />
                </div>
              )}
            </ReportCard>

            <ReportCard
              title={<SectionTitle icon={PieChart} title="Status Dağılımı" />}
            >
              {statusDistributionData.length === 0 ? (
                <EmptyTableLike text="Status dağılımı verisi bulunamadı." />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 220px)",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ width: "100%", height: `${CHART_HEIGHT}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={statusDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={108}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                          labelLine={false}
                        >
                          {statusDistributionData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={STATUS_META[entry.name]?.fill || SEMANTIC_STYLES.info.fill}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<StatusTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {statusDistributionData.map((item) => (
                      <StatusSummaryCard key={item.name} item={item} />
                    ))}
                  </div>
                </div>
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

function AppointmentsBreakdownTable({ rows, emptyText }) {
  return (
    <SortableReportTable
      columns={PRODUCT_BREAKDOWN_COLUMNS}
      rows={rows}
      emptyText={emptyText}
      defaultSort={{ key: "total", direction: "desc" }}
    />
  );
}

function UserPerformanceTable({ rows, emptyText }) {
  return (
    <SortableReportTable
      columns={USER_PERFORMANCE_COLUMNS}
      rows={rows}
      emptyText={emptyText}
      defaultSort={{ key: "total", direction: "desc" }}
    />
  );
}

function RateBadge({ value }) {
  const numeric = Number(value ?? 0);
  const semantic = getRateSemantic(numeric);
  const style = SEMANTIC_STYLES[semantic];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "78px",
        height: "32px",
        padding: "0 12px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 700,
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {formatPercent(numeric)}
    </span>
  );
}

function RateProgress({ value }) {
  const numeric = Number(value ?? 0);
  const semantic = getRateSemantic(numeric);
  const style = SEMANTIC_STYLES[semantic];

  return (
    <div style={{ minWidth: "120px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          fontSize: "12px",
          marginBottom: "6px",
          color: "#475569",
        }}
      >
        <strong>{formatPercent(numeric)}</strong>
      </div>

      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#e5e7eb",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, numeric))}%`,
            height: "100%",
            background: style.fill,
            borderRadius: "999px",
          }}
        />
      </div>
    </div>
  );
}

function getRateSemantic(value) {
  if (value >= 70) return "success";
  if (value >= 40) return "warning";
  return "danger";
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.day || label}</div>
      <div style={tooltipTextStyle}>
        Toplam Randevu: <strong>{row?.total ?? "-"}</strong>
      </div>
      <div style={tooltipTextStyle}>
        Satış: <strong>{row?.sales ?? "-"}</strong>
      </div>
    </TooltipCard>
  );
}

function StatusTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.name}</div>
      <div style={tooltipTextStyle}>
        Oran: <strong>{formatPercent(row?.percent || 0)}</strong>
      </div>
      <div style={tooltipTextStyle}>
        Adet: <strong>{row?.value ?? "-"}</strong>
      </div>
    </TooltipCard>
  );
}

function StatusSummaryCard({ item }) {
  const semantic = STATUS_META[item.name]?.semantic || "info";
  const style = SEMANTIC_STYLES[semantic];

  return (
    <div
      style={{
        border: `1px solid ${style.border}`,
        borderRadius: "14px",
        padding: "12px 14px",
        background: style.bg,
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
            background: STATUS_META[item.name]?.fill || SEMANTIC_STYLES.info.fill,
            display: "inline-block",
          }}
        />
        {item.name}
      </div>

      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
        Oran: <strong style={{ color: style.text }}>{formatPercent(item.percent)}</strong>
      </div>

      <div style={{ fontSize: "13px", color: "#64748b" }}>
        Adet: <strong style={{ color: "#0f172a" }}>{item.value}</strong>
      </div>
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

function EmptyTableLike({ text }) {
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

function formatShortDate(dateString) {
  if (!dateString) return "-";

  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;

  return `${parts[2]}.${parts[1]}`;
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
