import React, { useState } from "react";
import { Tag, BarChart2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  EmptyReportState,
  FilterGrid,
  FilterPanel,
  ReportCard,
  SelectField,
  TwoColumnGrid,
} from "./ReportUI";
import { getCustomerTagStats } from "../../services/customer";
import toast from "react-hot-toast";

const PALETTE = [
  "#0f254f",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#7c3aed",
  "#0369a1",
  "#047857",
  "#4338ca",
];

const TRUNCATE_LEN = 18;
const truncateLabel = (str) =>
  str && str.length > TRUNCATE_LEN ? str.slice(0, TRUNCATE_LEN - 1) + "…" : str;

export default function TagStatisticsReportSection({ userOptions, optionsLoading }) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedUserId) params.assigned_to = selectedUserId;
      const res = await getCustomerTagStats(params);
      setStats(res.data || { total: 0, by_tag: [] });
      toast.success("Rapor getirildi.");
    } catch {
      toast.error("Etiket istatistikleri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedUserId("");
    setStats(null);
  };

  const tagRows = (stats?.by_tag || []).map((row, idx) => ({
    name: row?.tag__tag_name ?? "Etiketsiz",
    count: row?.count ?? 0,
    color: PALETTE[idx % PALETTE.length],
  }));

  const total = stats?.total ?? 0;
  const chartHeight = Math.max(tagRows.length * 44, 180);

  return (
    <div className="reports-section-stack">
      <FilterPanel
        title="Filtreler"
        onSubmit={handleSubmit}
        onReset={handleReset}
        loading={loading}
      >
        <FilterGrid>
          <SelectField
            label="Kullanıcı"
            name="user_id"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            options={userOptions}
            placeholder={optionsLoading ? "Yükleniyor..." : "Tüm kullanıcılar"}
          />
        </FilterGrid>
      </FilterPanel>

      {!stats ? (
        <EmptyReportState
          title="Henüz veri yok"
          description="Kullanıcı seçin veya tüm istatistikleri görmek için direkt raporu getirin."
          icon={<Tag size={22} />}
        />
      ) : tagRows.length === 0 ? (
        <EmptyReportState
          title="Etiket verisi bulunamadı"
          description="Seçilen kullanıcıya ait etiketlenmiş müşteri bulunmuyor."
          icon={<Tag size={22} />}
        />
      ) : (
        <TwoColumnGrid>
          {/* ── Sol: Kompakt liste ── */}
          <ReportCard title={<CardTitle icon={Tag} label="Etiket Dağılımı" />}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <TotalRow total={total} />
              <div style={{ height: "1px", background: "#f1f5f9", margin: "6px 0" }} />
              {tagRows.map((row) => (
                <ListRow key={row.name} row={row} total={total} />
              ))}
            </div>
          </ReportCard>

          {/* ── Sağ: Yatay bar chart ── */}
          <ReportCard title={<CardTitle icon={BarChart2} label="Dağılım Grafiği" />}>
            <div style={{ width: "100%", height: `${chartHeight}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={tagRows}
                  margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tickFormatter={truncateLabel}
                    tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TagBarTooltip total={total} />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                    {tagRows.map((row, idx) => (
                      <Cell key={row.name} fill={PALETTE[idx % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ReportCard>
        </TwoColumnGrid>
      )}
    </div>
  );
}

function CardTitle({ icon: Icon, label }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "9px",
          background: "#eef5ff",
          border: "1px solid #c7d7f3",
          display: "grid",
          placeItems: "center",
          color: "#0f254f",
          flexShrink: 0,
        }}
      >
        <Icon size={15} />
      </div>
      <span style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
        {label}
      </span>
    </div>
  );
}

function TotalRow({ total }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 10px",
        borderRadius: "9px",
        background: "#f8fafc",
      }}
    >
      <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
        Toplam Müşteri
      </span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: 800,
          color: "#0f172a",
          background: "#e2e8f0",
          padding: "2px 10px",
          borderRadius: "999px",
        }}
      >
        {total}
      </span>
    </div>
  );
}

function ListRow({ row, total }) {
  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 10px",
        borderRadius: "8px",
        transition: "background 0.1s",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: row.color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: "13px",
          color: "#334155",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={row.name}
      >
        {row.name}
      </span>
      <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500, flexShrink: 0 }}>
        %{pct}
      </span>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: row.color,
          minWidth: "28px",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {row.count}
      </span>
    </div>
  );
}

function TagBarTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const { name, count } = payload[0].payload;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "8px 12px",
        boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
        fontSize: "13px",
      }}
    >
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>{name}</div>
      <div style={{ color: "#64748b" }}>
        Müşteri: <strong style={{ color: "#0f172a" }}>{count}</strong>
      </div>
      <div style={{ color: "#64748b" }}>
        Oran: <strong style={{ color: "#0f172a" }}>%{pct}</strong>
      </div>
    </div>
  );
}
