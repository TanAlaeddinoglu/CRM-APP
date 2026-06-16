import React from "react";
import {
  UserRound,
  Trophy,
  Shield,
  CalendarCheck,
  Tags,
  ShoppingBag,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import {
  ChartAxisTick,
  EmptyReportState,
  FilterGrid,
  FilterPanel,
  InputField,
  KpiGrid,
  ReportCard,
  SelectField,
  TwoColumnGrid,
} from "./ReportUI";

const MAIN_CHART_HEIGHT = 300;
const SIDE_CHART_HEIGHT = 280;
const TAG_CHANGE_COLOR  = "#f59e0b";
const INFO_FILL         = "#0f254f";
const SUCCESS_FILL      = "#16a34a";

export default function UserReportSection({
  filters,
  setFilters,
  report,
  loading,
  optionsLoading,
  userOptions,
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

  const tagDistributionData    = report?.charts?.tag_distribution    || [];
  const salesByProductData     = report?.charts?.sales_by_product    || [];
  const appointmentsTrendData  = (report?.charts?.appointments_trend || []).map((item) => ({
    ...item,
    short_day: formatShortDate(item.day),
  }));

  const selectedDayCount          = getSelectedDayCount(filters);
  const averageDailyAppointments  = calculateAverageDailyAppointments(
    report?.summary?.total_appointments,
    selectedDayCount
  );

  return (
    <div className="reports-section-stack">
      <FilterPanel title="Filtreler" onSubmit={onSubmit} onReset={onReset} loading={loading}>
        <FilterGrid>
          <SelectField
            label="User"
            name="user_id"
            value={filters.user_id}
            onChange={handleFilterChange}
            options={userOptions}
            placeholder={optionsLoading ? "Yükleniyor..." : "User seç"}
          />
          <SelectField
            label="Önerilen Aralık"
            name="preset"
            value={filters.preset}
            onChange={handleFilterChange}
            options={presetOptions}
            placeholder="Aralık seç"
          />
          <InputField label="Başlangıç Tarihi" name="date_from" type="date" value={filters.date_from} onChange={handleFilterChange} />
          <InputField label="Bitiş Tarihi"     name="date_to"   type="date" value={filters.date_to}   onChange={handleFilterChange} />
        </FilterGrid>
      </FilterPanel>

      {!report ? (
        <EmptyReportState
          title="Henüz veri yok"
          description="Filtreleri seçip raporu getir."
          icon={<UserRound size={22} />}
        />
      ) : (
        <div className="reports-section-stack">
          <KpiGrid
            items={[
              ["Aktif Müşteri",       report.summary?.active_customer_count],
              ["Etiket Değişimi",     report.summary?.tag_change_count],
              ["Toplam Randevu",      report.summary?.total_appointments],
              ["Günlük Ort. Randevu", averageDailyAppointments],
              ["Beklemede",           report.summary?.pending_appointments],
              ["Satış",               report.summary?.sales_appointments],
              ["Olumsuz",             report.summary?.negative_appointments],
              ["Dönüşüm %",           report.summary?.conversion_rate],
              ["Ret %",               report.summary?.rejection_rate],
            ]}
          />

          <TwoColumnGrid>
            <SelectedUserCard user={report.target_user} />
            <TopProductCard
              productName={report.summary?.top_product?.product_name}
              count={report.summary?.top_product?.count}
            />
          </TwoColumnGrid>

          <ReportCard title={<SectionTitle icon={CalendarCheck} title="Alınan Randevu Sayısı" />}>
            {appointmentsTrendData.length === 0 ? (
              <EmptyChart text="Randevu trend verisi bulunamadı." />
            ) : (
              <div className="reports-chart-wrap" style={{ height: `${MAIN_CHART_HEIGHT}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentsTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="short_day" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} width={40} />
                    <Tooltip content={<AppointmentsTrendTooltip />} />
                    <Bar dataKey="total" fill={INFO_FILL} radius={[8, 8, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ReportCard>

          <TwoColumnGrid>
            <ReportCard title={<SectionTitle icon={Tags} title="Dönem İçindeki Etiket Değişimleri" />}>
              {tagDistributionData.length === 0 ? (
                <EmptyChart text="Etiket değişim verisi bulunamadı." />
              ) : (
                <div className="reports-chart-wrap" style={{ height: `${SIDE_CHART_HEIGHT}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tagDistributionData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="tag_name" tick={<TagAxisTick />} interval={0} height={110} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={36} axisLine={false} tickLine={false} />
                      <Tooltip content={<TagTooltip />} />
                      <Bar dataKey="count" fill={TAG_CHANGE_COLOR} radius={[8, 8, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ReportCard>

            <ReportCard title={<SectionTitle icon={ShoppingBag} title="Ürüne Göre Satış" />}>
              {salesByProductData.length === 0 ? (
                <EmptyChart text="Ürün bazlı satış verisi bulunamadı." />
              ) : (
                <div className="reports-chart-wrap" style={{ height: `${SIDE_CHART_HEIGHT}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByProductData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="product_name" tick={<ChartAxisTick />} tickMargin={10} interval={0} height={52} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} width={40} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                      <Tooltip content={<ProductTooltip />} />
                      <Bar dataKey="count" fill={SUCCESS_FILL} radius={[8, 8, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
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

function SelectedUserCard({ user }) {
  const username = user?.username || "-";
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const role     = user?.role || "-";
  const initials = getInitials(fullName || username);

  return (
    <ReportCard title={<SectionTitle icon={UserRound} title="Seçilen User" />}>
      <div className="reports-user-grid">
        <div className="reports-user-profile">
          <div className="reports-user-avatar">{initials}</div>
          <div className="reports-user-profile__info">
            <div className="reports-user-name">{fullName || username}</div>
            <div className="reports-user-handle">@{username}</div>
          </div>
        </div>

        <div className="reports-info-grid">
          <InfoRow label="Username" value={username} />
          {fullName ? <InfoRow label="Ad Soyad" value={fullName} /> : null}
          <InfoRow
            label="Rol"
            value={
              <span className="reports-role-badge">
                <Shield size={14} />
                {role}
              </span>
            }
          />
        </div>
      </div>
    </ReportCard>
  );
}

function TopProductCard({ productName, count }) {
  const hasProduct = !!productName;

  return (
    <ReportCard title={<SectionTitle icon={Trophy} title="Top Product" />}>
      {hasProduct ? (
        <div className="reports-top-product-grid">
          <div className="reports-badge reports-semantic--success">
            <Trophy size={16} />
            En Çok Satan Ürün
          </div>
          <div className="reports-product-box">
            <div className="reports-product-name">{productName}</div>
            <div className="reports-count-badge">Satış: {count ?? 0}</div>
          </div>
        </div>
      ) : (
        <EmptyChart text="En çok satan ürün verisi bulunamadı." />
      )}
    </ReportCard>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="reports-info-row">
      <span className="reports-info-row__label">{label}</span>
      <div className="reports-info-row__value">{value}</div>
    </div>
  );
}

function EmptyChart({ text }) {
  return <div className="reports-empty-chart">{text}</div>;
}

const TAG_TICK_MAX = 13;

function TagAxisTick({ x, y, payload }) {
  if (!payload?.value) return null;
  const value = payload.value;

  const textProps = {
    textAnchor: "end",
    fill: "#64748b",
    fontSize: 12,
    fontWeight: 500,
    fontStyle: "italic",
    letterSpacing: 0.4,
    transform: "rotate(-90)",
  };

  if (value.length <= TAG_TICK_MAX) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text {...textProps} x={0} y={0} dy={4}>
          {value}
        </text>
      </g>
    );
  }

  const split = tagTickSplit(value, TAG_TICK_MAX);
  const line1 = value.slice(0, split).trim();
  const line2 = value.slice(split).trim();

  return (
    <g transform={`translate(${x},${y})`}>
      <text {...textProps} x={0} y={-7} dy={4}>
        {line1}
      </text>
      <text {...textProps} x={0} y={7} dy={4}>
        {line2}
      </text>
    </g>
  );
}

function tagTickSplit(str, max) {
  const sub = str.slice(0, max);
  const lastSpace = sub.lastIndexOf(" ");
  return lastSpace > 0 ? lastSpace + 1 : max;
}

function AppointmentsTrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="reports-tooltip-card">
      <div className="reports-tooltip-label">{row?.day || label}</div>
      <div className="reports-tooltip-text">Alınan Randevu Sayısı: <strong>{row?.total ?? "-"}</strong></div>
    </div>
  );
}

function TagTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="reports-tooltip-card">
      <div className="reports-tooltip-label">{row?.tag_name || label}</div>
      <div className="reports-tooltip-text">Değişim Sayısı: <strong>{row?.count ?? "-"}</strong></div>
    </div>
  );
}

function ProductTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="reports-tooltip-card">
      <div className="reports-tooltip-label">{row?.product_name || label}</div>
      <div className="reports-tooltip-text">Satış: <strong>{row?.count ?? "-"}</strong></div>
    </div>
  );
}

function getSelectedDayCount(filters) {
  if (filters?.date_from && filters?.date_to) {
    const start = new Date(filters.date_from);
    const end   = new Date(filters.date_to);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
      return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
  }
  if (filters?.preset) {
    const presetDays = Number(filters.preset);
    if (!Number.isNaN(presetDays) && presetDays > 0) return presetDays;
  }
  return 1;
}

function calculateAverageDailyAppointments(totalAppointments, selectedDayCount) {
  const total = Number(totalAppointments || 0);
  const days  = Number(selectedDayCount  || 1);
  if (days <= 0) return "0";
  return (total / days).toFixed(2);
}

function getInitials(text) {
  if (!text) return "U";
  const parts = String(text).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");
}

function formatShortDate(dateString) {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}.${parts[1]}`;
}
