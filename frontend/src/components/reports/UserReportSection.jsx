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

import { formatShortDate } from "../../utils/reportUtils";
import {
  ChartAxisTick,
  ChartWhenVisible,
  EmptyChart,
  EmptyReportState,
  KpiGrid,
  ReportCard,
  SectionTitle,
  TwoColumnGrid,
} from "./ReportUI";
import FilterBar from "../common/FilterBar.jsx";

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

  const tagDistributionData    = report?.charts?.tag_distribution    || [];
  const salesByProductData     = report?.charts?.sales_by_product    || [];
  const appointmentsTrendData  = (report?.charts?.appointments_trend || []).map((item) => ({
    ...item,
    short_day: formatShortDate(item.day),
  }));

  const selectedWorkingDayCount = getSelectedWorkingDayCount(filters);
  const averageDailyAppointments = formatAverageDailyAppointments(
    report?.summary?.daily_average_appointments ??
      calculateAverageDailyAppointments(
        report?.summary?.total_appointments,
        selectedWorkingDayCount
      )
  );

  return (
    <div className="reports-section-stack">
      <FilterBar.Panel title="Filtreler" onSubmit={onSubmit} onReset={onReset} loading={loading}>
        <FilterBar.Grid>
          <FilterBar.Select label="Kullanıcı" name="user_id" value={filters.user_id} onChange={handleFilterChange} options={userOptions} placeholder={optionsLoading ? "Yükleniyor..." : "User seç"} />
          <FilterBar.DateRange label="Tarih Aralığı" value={filters.preset} onChange={handleDateRangeChange} />
        </FilterBar.Grid>
      </FilterBar.Panel>

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
            <TopProductCard products={report.summary?.top_products} />
          </TwoColumnGrid>

          <ReportCard title={<SectionTitle icon={CalendarCheck} title="Alınan Randevu Sayısı" />}>
            {appointmentsTrendData.length === 0 ? (
              <EmptyChart text="Randevu trend verisi bulunamadı." />
            ) : (
              <ChartWhenVisible height={MAIN_CHART_HEIGHT}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentsTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="short_day" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} width={40} />
                    <Tooltip content={<AppointmentsTrendTooltip />} />
                    <Bar dataKey="total" fill={INFO_FILL} radius={[8, 8, 0, 0]} barSize={36} isAnimationActive={true} animationDuration={1400} animationEasing="ease-out" animationBegin={50} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWhenVisible>
            )}
          </ReportCard>

          <TwoColumnGrid>
            <ReportCard title={<SectionTitle icon={Tags} title="Dönem İçindeki Etiket Değişimleri" />}>
              {tagDistributionData.length === 0 ? (
                <EmptyChart text="Etiket değişim verisi bulunamadı." />
              ) : (
                <ChartWhenVisible height={SIDE_CHART_HEIGHT}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tagDistributionData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="tag_name" tick={<TagAxisTick />} interval={0} height={110} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={36} axisLine={false} tickLine={false} />
                      <Tooltip content={<TagTooltip />} />
                      <Bar dataKey="count" fill={TAG_CHANGE_COLOR} radius={[8, 8, 0, 0]} barSize={34} isAnimationActive={true} animationDuration={1400} animationEasing="ease-out" animationBegin={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWhenVisible>
              )}
            </ReportCard>

            <ReportCard title={<SectionTitle icon={ShoppingBag} title="Ürüne Göre Satış" />}>
              {salesByProductData.length === 0 ? (
                <EmptyChart text="Ürün bazlı satış verisi bulunamadı." />
              ) : (
                <ChartWhenVisible height={SIDE_CHART_HEIGHT}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByProductData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="product_name" tick={<ChartAxisTick />} tickMargin={10} interval={0} height={52} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} width={40} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                      <Tooltip content={<ProductTooltip />} />
                      <Bar dataKey="count" fill={SUCCESS_FILL} radius={[8, 8, 0, 0]} barSize={34} isAnimationActive={true} animationDuration={1400} animationEasing="ease-out" animationBegin={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWhenVisible>
              )}
            </ReportCard>
          </TwoColumnGrid>
        </div>
      )}
    </div>
  );
}

function SelectedUserCard({ user }) {
  const username = user?.username || "-";
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const role     = user?.role || "-";
  const initials = getInitials(fullName || username);

  return (
    <ReportCard title={<SectionTitle icon={UserRound} title="Seçilen Kullanıcı" />}>
      <div className="reports-user-card">
        <div className="reports-user-hero">
          <div className="reports-user-avatar-lg">{initials}</div>
          <div className="reports-user-hero__info">
            <div className="reports-user-hero__name">{fullName || username}</div>
            <div className="reports-user-hero__handle">@{username}</div>
            <span className="reports-role-badge reports-role-badge--light">
              <Shield size={12} />
              {role}
            </span>
          </div>
        </div>

        <div className="reports-user-meta">
          <div className="reports-user-meta-item">
            <span className="reports-user-meta-item__label">Username</span>
            <span className="reports-user-meta-item__value">@{username}</span>
          </div>
          <div className="reports-user-meta-item">
            <span className="reports-user-meta-item__label">Ad Soyad</span>
            <span className="reports-user-meta-item__value">{fullName || "—"}</span>
          </div>
        </div>
      </div>
    </ReportCard>
  );
}

const PODIUM_META = [
  { countColor: "#d97706", blockClass: "reports-podium__block--1" },
  { countColor: "#64748b", blockClass: "reports-podium__block--2" },
  { countColor: "#b45309", blockClass: "reports-podium__block--3" },
];

const PODIUM_ORDER = [1, 0, 2];

const BADGE_ICON_COLORS = [
  { stroke: "#92400e", text: "#92400e" },
  { stroke: "#374151", text: "#374151" },
  { stroke: "#451a03", text: "#451a03" },
];

const PODIUM_COUNT_COLORS = ["#d97706", "#64748b", "#b45309"];

function PodiumBadge({ rank }) {
  const { stroke, text } = BADGE_ICON_COLORS[rank - 1] || BADGE_ICON_COLORS[2];
  return (
    <div className={`reports-podium__badge reports-podium__badge--${rank}`}>
      <svg viewBox="0 0 42 42" fill="none" width="42" height="42">
        <path d="M11 16L15 11H27L31 16V23C31 29 25 33 21 34C17 33 11 29 11 23Z"
          stroke={stroke} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
        <path d="M16 11L17 8H25L26 11"
          stroke={stroke} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
        <text x="21" y="25" textAnchor="middle" fontSize="10" fontWeight="800"
          fill={text} fontFamily="-apple-system,sans-serif">{rank}</text>
      </svg>
    </div>
  );
}

function TopProductCard({ products }) {
  const hasProducts = Array.isArray(products) && products.length > 0;

  return (
    <ReportCard title={<SectionTitle icon={Trophy} title="En Çok Satan Ürünler" />}>
      {hasProducts ? (
        <div className="reports-podium">
          {PODIUM_ORDER.map((dataIdx) => {
            const p = products[dataIdx];
            if (!p) return null;
            const meta = PODIUM_META[dataIdx];
            return (
              <div key={p.product_id} className="reports-podium__col">
                <PodiumBadge rank={dataIdx + 1} />
                <div className="reports-podium__name">{p.product_name}</div>
                <div className="reports-podium__count" style={{ color: meta.countColor }}>{p.count}</div>
                <div className="reports-podium__count-label">satış</div>
                <div className={`reports-podium__block ${meta.blockClass}`}>
                  <span className="reports-podium__block-num">{dataIdx + 1}</span>
                </div>
              </div>
            );
          })}
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

function getSelectedWorkingDayCount(filters) {
  if (filters?.date_from && filters?.date_to) {
    const start = parseDateInput(filters.date_from);
    const end = parseDateInput(filters.date_to);

    if (start && end && end >= start) {
      const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      return countWorkingDaysFromEnd(end, diffDays);
    }
  }
  if (filters?.preset) {
    const presetDays = Number(filters.preset);
    if (!Number.isNaN(presetDays) && presetDays > 0) {
      return countWorkingDaysFromEnd(new Date(), presetDays);
    }
  }
  return 1;
}

function calculateAverageDailyAppointments(totalAppointments, selectedDayCount) {
  const total = Number(totalAppointments || 0);
  const days = Number(selectedDayCount || 1);

  if (days <= 0) return 0;
  return total / days;
}

function formatAverageDailyAppointments(value) {
  const numberValue = Number(value || 0);
  return numberValue.toFixed(2);
}

function parseDateInput(value) {
  const parts = String(value || "")
    .split("-")
    .map((part) => Number(part));

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
}

function countWorkingDaysFromEnd(endDate, dayCount) {
  const days = Math.max(1, Number(dayCount || 1));
  const end = new Date(
    Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  );
  let workingDays = 0;

  for (let offset = 0; offset < days; offset += 1) {
    const current = new Date(end);
    current.setUTCDate(end.getUTCDate() - offset);

    if (current.getUTCDay() !== 0) {
      workingDays += 1;
    }
  }

  return workingDays;
}

function getInitials(text) {
  if (!text) return "U";
  const parts = String(text).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");
}

