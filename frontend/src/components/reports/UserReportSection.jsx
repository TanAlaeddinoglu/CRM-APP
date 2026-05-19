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

  const tagDistributionData = (report?.charts?.tag_distribution || []).map((item) => ({
    ...item,
    short_name:
      item.tag_name && item.tag_name.length > 14
        ? `${item.tag_name.slice(0, 14)}...`
        : item.tag_name,
  }));

  const salesByProductData = (report?.charts?.sales_by_product || []).map((item) => ({
    ...item,
    short_name:
      item.product_name && item.product_name.length > 14
        ? `${item.product_name.slice(0, 14)}...`
        : item.product_name,
  }));

  const appointmentsTrendData = (report?.charts?.appointments_trend || []).map((item) => ({
    ...item,
    short_day: formatShortDate(item.day),
  }));

  const selectedDayCount = getSelectedDayCount(filters);
  const averageDailyAppointments = calculateAverageDailyAppointments(
    report?.summary?.total_appointments,
    selectedDayCount
  );

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
          icon={<UserRound size={22} />}
        />
      ) : (
        <div className="reports-section-stack">
          <KpiGrid
            items={[
              ["Aktif Data", report.summary?.active_customer_count],
              ["Etiket Değişimi", report.summary?.tag_change_count],
              ["Toplam Randevu", report.summary?.total_appointments],
              ["Günlük Ort. Randevu", averageDailyAppointments],
              ["Beklemede", report.summary?.pending_appointments],
              ["Satış", report.summary?.sales_appointments],
              ["Olumsuz", report.summary?.negative_appointments],
              ["Dönüşüm %", report.summary?.conversion_rate],
              ["Ret %", report.summary?.rejection_rate],
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
              <EmptyChartState text="Randevu trend verisi bulunamadı." />
            ) : (
              <div style={{ width: "100%", height: `${MAIN_CHART_HEIGHT}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={appointmentsTrendData}
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
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip content={<AppointmentsTrendTooltip />} />
                    <Bar
                      dataKey="total"
                      fill={SEMANTIC_STYLES.info.fill}
                      radius={[8, 8, 0, 0]}
                      barSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ReportCard>

          <TwoColumnGrid>
            <ReportCard
              title={<SectionTitle icon={Tags} title="Dönem İçindeki Etiket Değişimleri" />}
            >
              {tagDistributionData.length === 0 ? (
                <EmptyChartState text="Etiket değişim verisi bulunamadı." />
              ) : (
                <div style={{ width: "100%", height: `${SIDE_CHART_HEIGHT}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tagDistributionData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e5e7eb"
                      />
                      <XAxis
                        dataKey="short_name"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
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
                      <Tooltip content={<TagTooltip />} />
                      <Bar
                        dataKey="count"
                        fill={SEMANTIC_STYLES.info.fill}
                        radius={[8, 8, 0, 0]}
                        barSize={34}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ReportCard>

            <ReportCard title={<SectionTitle icon={ShoppingBag} title="Ürüne Göre Satış" />}>
              {salesByProductData.length === 0 ? (
                <EmptyChartState text="Ürün bazlı satış verisi bulunamadı." />
              ) : (
                <div style={{ width: "100%", height: `${SIDE_CHART_HEIGHT}px` }}>
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
                        dataKey="short_name"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
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
                        fill={SEMANTIC_STYLES.success.fill}
                        radius={[8, 8, 0, 0]}
                        barSize={34}
                      />
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

function SelectedUserCard({ user }) {
  const username = user?.username || "-";
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const role = user?.role || "-";
  const initials = getInitials(fullName || username);

  return (
    <ReportCard title={<SectionTitle icon={UserRound} title="Seçilen User" />}>
      <div style={{ display: "grid", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "16px",
            border: "1px solid #eef2f7",
            borderRadius: "18px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: SEMANTIC_STYLES.info.fill,
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
              fontSize: "20px",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {fullName || username}
            </div>

            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginTop: "4px",
              }}
            >
              @{username}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          <InfoRow label="Username" value={username} />
          {fullName ? <InfoRow label="Ad Soyad" value={fullName} /> : null}
          <InfoRow
            label="Rol"
            value={
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 12px",
                  borderRadius: "999px",
                  background: SEMANTIC_STYLES.info.bg,
                  color: SEMANTIC_STYLES.info.text,
                  border: `1px solid ${SEMANTIC_STYLES.info.border}`,
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
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
        <div style={{ display: "grid", gap: "16px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              width: "fit-content",
              background: SEMANTIC_STYLES.success.bg,
              border: `1px solid ${SEMANTIC_STYLES.success.border}`,
              color: SEMANTIC_STYLES.success.text,
              borderRadius: "999px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            <Trophy size={16} />
            En Çok Satan Ürün
          </div>

          <div
            style={{
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
                marginBottom: "8px",
                wordBreak: "break-word",
              }}
            >
              {productName}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "88px",
                height: "34px",
                borderRadius: "999px",
                background: SEMANTIC_STYLES.info.fill,
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                padding: "0 12px",
              }}
            >
              Satış: {count ?? 0}
            </div>
          </div>
        </div>
      ) : (
        <EmptyChartState text="Top product verisi bulunamadı." />
      )}
    </ReportCard>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        paddingBottom: "10px",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span style={{ color: "#64748b", fontSize: "14px" }}>{label}</span>
      <div
        style={{
          color: "#0f172a",
          fontSize: "14px",
          fontWeight: 700,
          textAlign: "right",
        }}
      >
        {value}
      </div>
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

function AppointmentsTrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.day || label}</div>
      <div style={tooltipTextStyle}>
        Alınan Randevu Sayısı: <strong>{row?.total ?? "-"}</strong>
      </div>
    </TooltipCard>
  );
}

function TagTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload;

  return (
    <TooltipCard>
      <div style={tooltipLabelStyle}>{row?.tag_name || label}</div>
      <div style={tooltipTextStyle}>
        Değişim Sayısı: <strong>{row?.count ?? "-"}</strong>
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

function getSelectedDayCount(filters) {
  if (filters?.date_from && filters?.date_to) {
    const start = new Date(filters.date_from);
    const end = new Date(filters.date_to);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
      const diffMs = end.getTime() - start.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  if (filters?.preset) {
    const presetDays = Number(filters.preset);
    if (!Number.isNaN(presetDays) && presetDays > 0) {
      return presetDays;
    }
  }

  return 1;
}

function calculateAverageDailyAppointments(totalAppointments, selectedDayCount) {
  const total = Number(totalAppointments || 0);
  const days = Number(selectedDayCount || 1);

  if (days <= 0) return "0";
  return (total / days).toFixed(2);
}

function getInitials(text) {
  if (!text) return "U";

  const parts = String(text).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
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
