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
  KpiGrid,
  ReportCard,
  SortableTableCard,
  TwoColumnGrid,
} from "./ReportUI";
import FilterBar from "../common/FilterBar.jsx";

const CHART_HEIGHT = 280;

const SEMANTIC_STYLES = {
  success: { fill: "#16a34a" },
  warning: { fill: "#f59e0b" },
  danger:  { fill: "#dc2626" },
  info:    { fill: "#0f254f" },
};

const STATUS_META = {
  Beklemede: { semantic: "warning", fill: "#f59e0b" },
  Satış:     { semantic: "success", fill: "#16a34a" },
  Olumsuz:   { semantic: "danger",  fill: "#dc2626" },
};

const USER_PERFORMANCE_COLUMNS = [
  { key: "username",   label: "User",            type: "text",   width: "24%", truncate: true },
  { key: "total",      label: "Toplam Randevu",  type: "number", width: "19%" },
  { key: "pending",    label: "Beklemede",        type: "number", width: "16%" },
  { key: "sales",      label: "Satış",            type: "number", width: "12%" },
  { key: "negative",   label: "Olumsuz",          type: "number", width: "13%" },
  {
    key: "sales_rate",
    label: "Satış %",
    type: "number",
    width: "16%",
    render: (row) => <RateBadge value={row.sales_rate} />,
  },
];

const PRODUCT_BREAKDOWN_COLUMNS = [
  { key: "product_name", label: "Ürün",      type: "text",   width: "24%", truncate: true },
  { key: "total",        label: "Toplam",    type: "number", width: "14%" },
  { key: "pending",      label: "Beklemede", type: "number", width: "16%" },
  { key: "sales",        label: "Satış",     type: "number", width: "12%" },
  { key: "negative",     label: "Olumsuz",   type: "number", width: "14%" },
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

  const trendData = (report?.charts?.trend || []).map((item) => ({
    ...item,
    short_day: formatShortDate(item.day),
  }));

  const totalAppointments = Number(report?.summary?.total_appointments || 0);

  const statusDistributionData = report
    ? [
        { name: "Beklemede", value: Number(report.summary?.pending_appointments  || 0) },
        { name: "Satış",     value: Number(report.summary?.sales_appointments    || 0) },
        { name: "Olumsuz",   value: Number(report.summary?.negative_appointments || 0) },
      ]
        .filter((item) => item.value > 0)
        .map((item) => ({
          ...item,
          percent: totalAppointments > 0 ? (item.value / totalAppointments) * 100 : 0,
        }))
    : [];

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
          icon={<CalendarDays size={22} />}
        />
      ) : (
        <div className="reports-section-stack">
          <KpiGrid
            items={[
              ["Toplam Randevu", report.summary?.total_appointments],
              ["Beklemede",      report.summary?.pending_appointments],
              ["Satış",          report.summary?.sales_appointments],
              ["Olumsuz",        report.summary?.negative_appointments],
              ["Satış %",        report.summary?.sales_rate],
              ["Beklemede %",    report.summary?.pending_rate],
              ["Olumsuz %",      report.summary?.negative_rate],
            ]}
          />

          <TwoColumnGrid>
            <SortableTableCard
              title={<SectionTitle icon={Package} title="Ürün Kırılımı" />}
              columns={PRODUCT_BREAKDOWN_COLUMNS}
              rows={report.tables?.product_breakdown || []}
              emptyText="Ürün kırılımı bulunamadı."
              defaultSort={{ key: "total", direction: "desc" }}
              footer={
                <div className="reports-table-footer">
                  <span className="reports-table-footer__label">Toplam Randevu</span>
                  <strong className="reports-table-footer__value">
                    {report.summary?.total_appointments ?? "-"}
                  </strong>
                </div>
              }
            />

            <SortableTableCard
              title={<SectionTitle icon={UserRound} title="Kullanıcı Performansı" />}
              columns={USER_PERFORMANCE_COLUMNS}
              rows={report.tables?.user_performance || []}
              emptyText="Kullanıcı performans verisi bulunamadı."
              defaultSort={{ key: "total", direction: "desc" }}
            />
          </TwoColumnGrid>

          <TwoColumnGrid>
            <ReportCard title={<SectionTitle icon={Activity} title="Trend" />}>
              {trendData.length === 0 ? (
                <EmptyChart text="Trend verisi bulunamadı." />
              ) : (
                <div className="reports-chart-wrap" style={{ height: `${CHART_HEIGHT}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={trendData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
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
                      <Bar dataKey="total" name="Toplam Randevu" fill="#cbd5e1" radius={[8, 8, 0, 0]} barSize={34} />
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
                <div className="reports-legend">
                  <LegendChip color="#cbd5e1" label="Toplam Randevu" />
                  <LegendChip color={SEMANTIC_STYLES.info.fill} label="Satış" />
                </div>
              )}
            </ReportCard>

            <ReportCard title={<SectionTitle icon={PieChart} title="Status Dağılımı" />}>
              {statusDistributionData.length === 0 ? (
                <EmptyChart text="Status dağılımı verisi bulunamadı." />
              ) : (
                <div className="reports-pie-grid">
                  <div className="reports-chart-wrap" style={{ height: `${CHART_HEIGHT}px` }}>
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

                  <div className="reports-pie-legend">
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
    <div className="reports-section-title">
      <div className="reports-section-title__icon">
        {React.createElement(Icon, { size: 16 })}
      </div>
      <span className="reports-section-title__text">{title}</span>
    </div>
  );
}

function RateBadge({ value }) {
  const numeric = Number(value ?? 0);
  const semantic = getRateSemantic(numeric);

  return (
    <span className={`reports-rate-badge reports-semantic--${semantic}`}>
      {formatPercent(numeric)}
    </span>
  );
}

function RateProgress({ value }) {
  const numeric = Number(value ?? 0);
  const semantic = getRateSemantic(numeric);
  const fill = { success: "#16a34a", warning: "#f59e0b", danger: "#dc2626" }[semantic];

  return (
    <div className="reports-rate-progress">
      <div className="reports-rate-progress__track">
        <div
          className="reports-rate-progress__bar"
          style={{ width: `${Math.max(0, Math.min(100, numeric))}%`, background: fill }}
        />
      </div>
      <span className="reports-rate-progress__value" style={{ color: fill }}>
        {formatPercent(numeric)}
      </span>
    </div>
  );
}

function StatusSummaryCard({ item }) {
  const semantic = STATUS_META[item.name]?.semantic || "info";
  const fill = STATUS_META[item.name]?.fill || SEMANTIC_STYLES.info.fill;

  return (
    <div className={`reports-status-card reports-semantic--${semantic}`}>
      <div className="reports-status-card__header">
        <span className="reports-status-dot" style={{ background: fill }} />
        {item.name}
      </div>
      <div className="reports-status-card__meta">
        Oran: <strong>{formatPercent(item.percent)}</strong>
      </div>
      <div className="reports-status-card__meta reports-status-card__meta--plain">
        Adet: <strong>{item.value}</strong>
      </div>
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

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;

  return (
    <div className="reports-tooltip-card">
      <div className="reports-tooltip-label">{row?.day || label}</div>
      <div className="reports-tooltip-text">Toplam Randevu: <strong>{row?.total ?? "-"}</strong></div>
      <div className="reports-tooltip-text">Satış: <strong>{row?.sales ?? "-"}</strong></div>
    </div>
  );
}

function StatusTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;

  return (
    <div className="reports-tooltip-card">
      <div className="reports-tooltip-label">{row?.name}</div>
      <div className="reports-tooltip-text">Oran: <strong>{formatPercent(row?.percent || 0)}</strong></div>
      <div className="reports-tooltip-text">Adet: <strong>{row?.value ?? "-"}</strong></div>
    </div>
  );
}

function getRateSemantic(value) {
  if (value >= 70) return "success";
  if (value >= 40) return "warning";
  return "danger";
}

function formatShortDate(dateString) {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}.${parts[1]}`;
}
