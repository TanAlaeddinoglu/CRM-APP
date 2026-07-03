import React from "react";
import { BarChart3, CalendarDays, RotateCcw } from "lucide-react";
import { KpiGrid, RateProgress, SortableReportTable } from "./ReportUI";
import { formatCurrency } from "../../utils/reportUtils";
import FilterBar from "../common/FilterBar.jsx";

const PRICE_DISTRIBUTION_COLUMNS = [
  {
    key: "product_name",
    label: "Ürün",
    type: "text",
    width: "16%",
    truncate: true,
  },
  {
    key: "sale_price",
    label: "Satış Fiyatı",
    type: "number",
    width: "12%",
    align: "right",
    render: (row) => formatCurrency(row.sale_price),
  },
  {
    key: "sale_count",
    label: "Satış Adedi",
    type: "number",
    width: "11%",
    align: "right",
  },
  {
    key: "not_started_count",
    label: "Ödemeye Başlanmadı",
    type: "number",
    width: "16%",
    align: "right",
    render: (row) => row.not_started_count ?? 0,
  },
  {
    key: "expected_total",
    label: "Beklenen Tutar",
    type: "number",
    width: "13%",
    align: "right",
    render: (row) => formatCurrency(row.expected_total),
  },
  {
    key: "collected_total",
    label: "Tahsil Edilen",
    type: "number",
    width: "13%",
    align: "right",
    render: (row) => formatCurrency(row.collected_total),
  },
  {
    key: "remaining_total",
    label: "Kalan Tutar",
    type: "number",
    width: "13%",
    align: "right",
    render: (row) => formatCurrency(row.remaining_total),
  },
  {
    key: "collection_rate",
    label: "Tahsilat %",
    type: "number",
    width: "11%",
    align: "right",
    render: (row) => <RateProgress value={row.collection_rate} />,
  },
];

const PRICE_DISTRIBUTION_DEFAULT_SORT = { key: "sale_count", direction: "desc" };

export default function ProductPriceDistributionReportSection({
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
  const summary = report?.summary || {};
  const rows = report?.tables?.price_distribution || [];
  const [sortConfig, setSortConfig] = React.useState(PRICE_DISTRIBUTION_DEFAULT_SORT);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateRangeChange = (key, from, to) => {
    setFilters((prev) => ({
      ...prev,
      preset: key === "custom" ? "" : key,
      date_from: from,
      date_to: to,
    }));
  };

  const hasReport = !!report;

  return (
    <div className="reports-section-stack reports-section-stack--loose">
      <FilterBar.Panel title="Filtreler" onSubmit={onSubmit} onReset={onReset} loading={loading}>
        <FilterBar.Grid>
          <FilterBar.Select label="User" value={filters.user_id} onChange={(e) => handleChange("user_id", e.target.value)} options={userOptions} placeholder={optionsLoading ? "Yükleniyor..." : "Tümü"} />
          <FilterBar.Select label="Ürün" value={filters.product_id} onChange={(e) => handleChange("product_id", e.target.value)} options={productOptions} placeholder={optionsLoading ? "Yükleniyor..." : "Tümü"} />
          <FilterBar.DateRange label="Tarih Aralığı" value={filters.preset} onChange={handleDateRangeChange} />
        </FilterBar.Grid>
      </FilterBar.Panel>

      {!hasReport && !loading && (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Henüz veri yok"
          text="Filtreleri seçip raporu getir."
        />
      )}

      {loading && (
        <EmptyState
          icon={<BarChart3 size={28} />}
          title="Rapor hazırlanıyor"
          text="Lütfen bekle..."
        />
      )}

      {hasReport && !loading && (
        <>
          <KpiGrid
            items={[
              ["Toplam Satış Adedi",        summary.total_sales_count ?? 0],
              ["Ödemeye Başlanmadı",         summary.total_not_started_sales_count ?? 0],
              ["Toplam Beklenen Tutar",      summary.total_expected_amount],
              ["Toplam Tahsil Edilen",       summary.total_collected_amount],
              ["Toplam Kalan Tutar",         summary.total_remaining_amount],
              ["Tahsilat Oranı %",           summary.overall_collection_rate ?? 0],
            ]}
          />

          <div className="reports-panel">
            <div className="reports-panel__header">
              <div className="reports-panel__icon">
                <BarChart3 size={20} />
              </div>

              <h3 className="reports-panel__title">
                Ürün Fiyat Dağılımı
              </h3>

              {rows.length > 0 && (
                <button
                  type="button"
                  className="reports-sort-reset"
                  onClick={() => setSortConfig(PRICE_DISTRIBUTION_DEFAULT_SORT)}
                  title="Varsayılan sıralamaya dön"
                  style={{ marginLeft: "auto" }}
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

            <SortableReportTable
              columns={PRICE_DISTRIBUTION_COLUMNS}
              rows={rows}
              emptyText="Seçilen filtrelere uygun veri yok."
              defaultSort={PRICE_DISTRIBUTION_DEFAULT_SORT}
              minWidth="980px"
              sortConfig={sortConfig}
              onSort={setSortConfig}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="reports-field">
      <span className="reports-field__label">
        {label}
      </span>
      {children}
    </label>
  );
}



function EmptyState({ icon, title, text }) {
  return (
    <div className="reports-centered-empty">
      <div className="reports-centered-empty__content">
        <div className="reports-centered-empty__icon">
          {icon}
        </div>

        <h3 className="reports-centered-empty__title">
          {title}
        </h3>

        <p className="reports-centered-empty__text">
          {text}
        </p>
      </div>
    </div>
  );
}

