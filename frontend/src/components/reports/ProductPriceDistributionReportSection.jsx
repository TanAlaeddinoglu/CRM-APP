import React from "react";
import { BarChart3, CalendarDays, Filter, RotateCcw } from "lucide-react";
import { SortableReportTable } from "./ReportUI";

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
    render: (row) => formatMoney(row.sale_price),
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
    render: (row) => formatMoney(row.expected_total),
  },
  {
    key: "collected_total",
    label: "Tahsil Edilen",
    type: "number",
    width: "13%",
    align: "right",
    render: (row) => formatMoney(row.collected_total),
  },
  {
    key: "remaining_total",
    label: "Kalan Tutar",
    type: "number",
    width: "13%",
    align: "right",
    render: (row) => formatMoney(row.remaining_total),
  },
  {
    key: "collection_rate",
    label: "Tahsilat %",
    type: "number",
    width: "11%",
    align: "right",
    render: (row) => <CollectionRateCell value={row.collection_rate} />,
  },
];

export default function ProductPriceDistributionReportSection({
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
  const summary = report?.summary || {};
  const rows = report?.tables?.price_distribution || [];

  const handleChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const hasReport = !!report;

  return (
    <div className="reports-section-stack reports-section-stack--loose">
      <div className="reports-panel">
        <div className="reports-panel__header reports-panel__header--spacious">
          <div className="reports-panel__icon">
            <Filter size={20} />
          </div>

          <h3 className="reports-panel__title">
            Filtreler
          </h3>
        </div>

        <div className="reports-price-grid">
          <Field label="Preset">
            <select
              value={filters.preset}
              onChange={(e) => handleChange("preset", e.target.value)}
              className="reports-field__control"
            >
              {presetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Başlangıç Tarihi">
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleChange("date_from", e.target.value)}
              className="reports-field__control"
            />
          </Field>

          <Field label="Bitiş Tarihi">
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleChange("date_to", e.target.value)}
              className="reports-field__control"
            />
          </Field>

          <Field label="User">
            <select
              value={filters.user_id}
              onChange={(e) => handleChange("user_id", e.target.value)}
              disabled={optionsLoading}
              className="reports-field__control"
            >
              <option value="">Tümü</option>
              {userOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ürün">
            <select
              value={filters.product_id}
              onChange={(e) => handleChange("product_id", e.target.value)}
              disabled={optionsLoading}
              className="reports-field__control"
            >
              <option value="">Tümü</option>
              {productOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="reports-form-actions">
          <button
            className="btn-secondary reports-action-button"
            onClick={onReset}
            disabled={loading}
          >
            <RotateCcw size={16} />
            Temizle
          </button>

          <button className="btn-primary" onClick={onSubmit} disabled={loading}>
            {loading ? "Yükleniyor..." : "Raporu Getir"}
          </button>
        </div>
      </div>

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
          <div className="reports-summary-grid">
            <SummaryCard
              title="Toplam Satış Adedi"
              value={summary.total_sales_count ?? 0}
            />
            <SummaryCard
              title="Toplam Ödemeye Başlanmadı"
              value={summary.total_not_started_sales_count ?? 0}
            />
            <SummaryCard
              title="Toplam Beklenen Tutar"
              value={formatMoney(summary.total_expected_amount)}
            />
            <SummaryCard
              title="Toplam Tahsil Edilen"
              value={formatMoney(summary.total_collected_amount)}
            />
            <SummaryCard
              title="Toplam Kalan Tutar"
              value={formatMoney(summary.total_remaining_amount)}
            />
            <SummaryCard
              title="Genel Tahsilat Oranı"
              value={`%${summary.overall_collection_rate ?? 0}`}
            />
          </div>

          <div className="reports-panel">
            <div className="reports-panel__header">
              <div className="reports-panel__icon">
                <BarChart3 size={20} />
              </div>

              <h3 className="reports-panel__title">
                Ürün Fiyat Dağılımı
              </h3>
            </div>

            <SortableReportTable
              columns={PRICE_DISTRIBUTION_COLUMNS}
              rows={rows}
              emptyText="Seçilen filtrelere uygun veri yok."
              defaultSort={{ key: "sale_count", direction: "desc" }}
              minWidth="980px"
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

function SummaryCard({ title, value }) {
  return (
    <div className="reports-summary-card">
      <div className="reports-summary-card__title">
        {title}
      </div>
      <div className="reports-summary-card__value">
        {value}
      </div>
    </div>
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

function CollectionRateCell({ value }) {
  const numericValue = Number(value || 0);
  const safeValue = Math.max(0, Math.min(100, numericValue));
  const barColor = getCollectionBarColor(numericValue);

  return (
    <div className="reports-collection-rate">
      <span className="reports-collection-rate__label">
        %{numericValue.toFixed(2)}
      </span>

      <div className="reports-collection-rate__track">
        <div
          className="reports-collection-rate__bar"
          style={{
            width: `${safeValue}%`,
            background: barColor,
          }}
        />
      </div>
    </div>
  );
}

function getCollectionBarColor(value) {
  if (value >= 80) return "#16a34a";
  if (value >= 50) return "#f59e0b";
  return "#dc2626";
}

function formatMoney(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
}
