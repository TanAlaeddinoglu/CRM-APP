import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Package,
  UserRound,
  Activity,
  PieChart,
  ArrowUpRight,
  Info,
  Search,
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

import { formatPercent, formatShortDate } from "../../utils/reportUtils";
import {
  ChartWhenVisible,
  EmptyChart,
  EmptyReportState,
  KpiGrid,
  LegendChip,
  RateBadge,
  RateProgress,
  ReportCard,
  SectionTitle,
  SortableTableCard,
  TwoColumnGrid,
} from "./ReportUI";
import FilterBar from "../common/FilterBar.jsx";
import { getAppointments } from "../../services/appointment";

const CHART_HEIGHT = 280;

const STATUS_API_MAP = {
  Beklemede: "beklemede",
  Satış:     "satis",
  Olumsuz:   "olumsuz",
};

const STATUS_INFO = {
  Beklemede: "Sonucu henüz girilmemiş, bekleyen randevular.",
  Satış:     "Ürün satışıyla sonuçlanan başarılı randevular.",
  Olumsuz:   "Olumsuz sonuçlanan veya iptal edilen randevular.",
};

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
  const [drillDownStatus, setDrillDownStatus] = useState(null);

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
                <ChartWhenVisible height={CHART_HEIGHT}>
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
                      <Bar dataKey="total" name="Toplam Randevu" fill="#cbd5e1" radius={[8, 8, 0, 0]} barSize={34} isAnimationActive={true} animationDuration={1400} animationEasing="ease-out" animationBegin={50} />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        name="Satış"
                        stroke={SEMANTIC_STYLES.info.fill}
                        strokeWidth={3}
                        dot={{ r: 4, fill: SEMANTIC_STYLES.info.fill }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={true}
                        animationDuration={1800}
                        animationEasing="ease-out"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartWhenVisible>
              )}

              {trendData.length > 0 && (
                <div className="reports-legend">
                  <LegendChip color="#cbd5e1" label="Toplam Randevu" />
                  <LegendChip color={SEMANTIC_STYLES.info.fill} label="Satış" />
                </div>
              )}
            </ReportCard>

            <ReportCard
              title={
                <div className="reports-section-title">
                  <div className="reports-section-title__icon">
                    <PieChart size={16} />
                  </div>
                  <span className="reports-section-title__text">Status Dağılımı</span>
                  <span className="reports-section-title__hint">
                    <ArrowUpRight size={12} />
                    Detay için tıklayın
                  </span>
                </div>
              }
            >
              {statusDistributionData.length === 0 ? (
                <EmptyChart text="Status dağılımı verisi bulunamadı." />
              ) : (
                <div className="reports-pie-grid">
                  <ChartWhenVisible height={CHART_HEIGHT}>
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
                          isAnimationActive={true}
                          animationDuration={1200}
                          animationEasing="ease-out"
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
                  </ChartWhenVisible>

                  <div className="reports-pie-legend">
                    {statusDistributionData.map((item) => (
                      <StatusSummaryCard
                        key={item.name}
                        item={item}
                        onClick={() => setDrillDownStatus(item.name)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </ReportCard>
          </TwoColumnGrid>
        </div>
      )}

      {drillDownStatus && (
        <AppointmentDrillDownModal
          status={drillDownStatus}
          filters={filters}
          onClose={() => setDrillDownStatus(null)}
        />
      )}
    </div>
  );
}

function StatusSummaryCard({ item, onClick }) {
  const semantic = STATUS_META[item.name]?.semantic || "info";
  const fill = STATUS_META[item.name]?.fill || SEMANTIC_STYLES.info.fill;

  return (
    <div
      className={`reports-status-card reports-semantic--${semantic}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <div className="reports-status-card__header">
        <span className="reports-status-dot" style={{ background: fill }} />
        {item.name}
        {STATUS_INFO[item.name] && (
          <span className="reports-status-info" onClick={(e) => e.stopPropagation()}>
            <Info size={13} />
            <span className="reports-status-info__tooltip">{STATUS_INFO[item.name]}</span>
          </span>
        )}
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

function AppointmentDrillDownModal({ status, filters, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = { status: STATUS_API_MAP[status], page_size: 100 };
    if (filters.user_id)   params.user_id   = filters.user_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to)   params.date_to   = filters.date_to;

    getAppointments(params)
      .then((res) => setRows(res.data?.results ?? res.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [status, filters]);

  const fill = STATUS_META[status]?.fill || "#6b7280";

  const visible = search.trim()
    ? rows.filter((a) => {
        const q = search.toLowerCase();
        return (
          (a.customer || "").toLowerCase().includes(q) ||
          (a.appointment_type || "").toLowerCase().includes(q)
        );
      })
    : rows;

  return (
    <div className="drill-modal-overlay" onClick={onClose}>
      <div className="drill-modal" onClick={(e) => e.stopPropagation()}>
        <div className="drill-modal__header">
          <span className="drill-modal__dot" style={{ background: fill }} />
          <h3 className="drill-modal__title">{status} Randevuları</h3>
          <div className="drill-modal__search">
            <Search size={14} />
            <input
              placeholder="Müşteri veya tür ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <button className="drill-modal__close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <p className="drill-modal__empty">Yükleniyor…</p>
        ) : visible.length === 0 ? (
          <p className="drill-modal__empty">
            {rows.length === 0 ? "Bu dönemde kayıt bulunamadı." : "Arama sonucu bulunamadı."}
          </p>
        ) : (
          <div className="drill-modal__body">
            <table className="drill-modal__table">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>Randevu</th>
                  <th>Tür</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() =>
                      a.customer_pk &&
                      window.open(`/customers/${a.customer_pk}`, "_blank")
                    }
                  >
                    <td>
                      <span className={a.customer_pk ? "drill-modal__customer-link" : ""}>
                        {a.customer || "-"}
                      </span>
                    </td>
                    <td>{a.name || "-"}</td>
                    <td>{a.appointment_type || "-"}</td>
                    <td>{a.date ? a.date.slice(0, 10) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
