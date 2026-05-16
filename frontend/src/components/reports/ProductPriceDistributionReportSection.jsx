import React from "react";
import { BarChart3, CalendarDays, Filter, RotateCcw } from "lucide-react";

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
  const hasRows = rows.length > 0;

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

            {hasRows ? (
              <div className="reports-price-table-wrap">
                <table className="reports-price-table">
                  <thead>
                    <tr>
                      <Th>Ürün</Th>
                      <Th align="right">Satış Fiyatı</Th>
                      <Th align="right">Satış Adedi</Th>
                      <Th align="right">Beklenen Tutar</Th>
                      <Th align="right">Tahsil Edilen</Th>
                      <Th align="right">Kalan Tutar</Th>
                      <Th align="right">Tahsilat %</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={`${row.product_id}-${row.sale_price}-${index}`}
                      >
                        <Td>{row.product_name}</Td>
                        <Td align="right">{formatMoney(row.sale_price)}</Td>
                        <Td align="right">{row.sale_count}</Td>
                        <Td align="right">{formatMoney(row.expected_total)}</Td>
                        <Td align="right">{formatMoney(row.collected_total)}</Td>
                        <Td align="right">{formatMoney(row.remaining_total)}</Td>
                        <Td align="right">
                          <CollectionRateCell value={row.collection_rate} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="reports-inline-empty">
                <div className="reports-inline-empty__icon">
                  <BarChart3 size={24} />
                </div>

                <h3 className="reports-inline-empty__title">
                  Kayıt bulunamadı
                </h3>

                <p className="reports-inline-empty__text">
                  Seçilen filtrelere uygun veri yok.
                </p>
              </div>
            )}
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

function Th({ children, align = "left" }) {
  return (
    <th className={align === "right" ? "reports-cell--right" : undefined}>
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td className={align === "right" ? "reports-cell--right" : undefined}>
      {children}
    </td>
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
