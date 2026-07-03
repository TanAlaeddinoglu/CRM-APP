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
  ChartWhenVisible,
  EmptyReportState,
  ReportCard,
  SectionTitle,
  TwoColumnGrid,
} from "./ReportUI";
import FilterBar from "../common/FilterBar.jsx";
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
  const [stats, setStats]   = useState(null);
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
    name:  row?.tag__tag_name ?? "Etiketsiz",
    count: row?.count ?? 0,
    color: PALETTE[idx % PALETTE.length],
  }));

  const total       = stats?.total ?? 0;
  const chartHeight = Math.max(tagRows.length * 44, 180);

  return (
    <div className="reports-section-stack">
      <FilterBar.Panel title="Filtreler" onSubmit={handleSubmit} onReset={handleReset} loading={loading}>
        <FilterBar.Grid>
          <FilterBar.Select label="Kullanıcı" name="user_id" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} options={userOptions} placeholder={optionsLoading ? "Yükleniyor..." : "Tüm kullanıcılar"} />
        </FilterBar.Grid>
      </FilterBar.Panel>

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
          <ReportCard title={<SectionTitle icon={Tag} title="Etiket Dağılımı" size="sm" />}>
            <div className="reports-list-rows">
              <TotalRow total={total} />
              <div className="reports-divider" />
              {tagRows.map((row) => (
                <ListRow key={row.name} row={row} total={total} />
              ))}
            </div>
          </ReportCard>

          <ReportCard title={<SectionTitle icon={BarChart2} title="Dağılım Grafiği" size="sm" />}>
            <ChartWhenVisible height={chartHeight}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={tagRows}
                  margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={130} tickFormatter={truncateLabel} tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TagBarTooltip total={total} />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={true} animationDuration={1400} animationEasing="ease-out" animationBegin={50}>
                    {tagRows.map((row, idx) => (
                      <Cell key={row.name} fill={PALETTE[idx % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartWhenVisible>
          </ReportCard>
        </TwoColumnGrid>
      )}
    </div>
  );
}

function TotalRow({ total }) {
  return (
    <div className="reports-total-row">
      <span className="reports-total-row__label">Toplam Müşteri</span>
      <span className="reports-total-row__value">{total}</span>
    </div>
  );
}

function ListRow({ row, total }) {
  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
  return (
    <div className="reports-list-row">
      <span className="reports-list-row__dot" style={{ background: row.color }} />
      <span className="reports-list-row__name" title={row.name}>{row.name}</span>
      <span className="reports-list-row__pct">%{pct}</span>
      <span className="reports-list-row__count" style={{ color: row.color }}>{row.count}</span>
    </div>
  );
}

function TagBarTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const { name, count } = payload[0].payload;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="reports-tooltip-card">
      <div className="reports-tooltip-label reports-tooltip-label--bold">{name}</div>
      <div className="reports-tooltip-text">Müşteri: <strong>{count}</strong></div>
      <div className="reports-tooltip-text">Oran: <strong>%{pct}</strong></div>
    </div>
  );
}
