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
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          border: "1px solid #e6edf5",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
          padding: "22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "#eef4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#19305c",
            }}
          >
            <Filter size={20} />
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Filtreler
          </h3>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          <Field label="Preset">
            <select
              value={filters.preset}
              onChange={(e) => handleChange("preset", e.target.value)}
              style={inputStyle}
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
              style={inputStyle}
            />
          </Field>

          <Field label="Bitiş Tarihi">
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleChange("date_to", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="User">
            <select
              value={filters.user_id}
              onChange={(e) => handleChange("user_id", e.target.value)}
              disabled={optionsLoading}
              style={inputStyle}
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
              style={inputStyle}
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

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn-secondary"
            onClick={onReset}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
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

          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              border: "1px solid #e6edf5",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
              padding: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  background: "#eef4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#19305c",
                }}
              >
                <BarChart3 size={20} />
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Ürün Fiyat Dağılımı
              </h3>
            </div>

            {hasRows ? (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "980px",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #eaecf0" }}>
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
                        style={{ borderBottom: "1px solid #f2f4f7" }}
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
              <div
                style={{
                  textAlign: "center",
                  padding: "36px 12px 8px",
                  color: "#667085",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    margin: "0 auto 14px",
                    borderRadius: "18px",
                    background: "#eef4ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#19305c",
                  }}
                >
                  <BarChart3 size={24} />
                </div>

                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#101828",
                  }}
                >
                  Kayıt bulunamadı
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#667085",
                  }}
                >
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
    <label
      style={{
        display: "grid",
        gap: "8px",
      }}
    >
      <span
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#475467",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div
      style={{
        position: "relative",
        background: "#ffffff",
        borderRadius: "20px",
        border: "1px solid #e6edf5",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
        padding: "18px 18px 18px 24px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "5px",
          background: "#19305c",
          borderTopLeftRadius: "20px",
          borderBottomLeftRadius: "20px",
        }}
      />

      <div
        style={{
          fontSize: "14px",
          color: "#667085",
          marginBottom: "10px",
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: 800,
          color: "#101828",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "24px",
        border: "1px solid #e6edf5",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
        minHeight: "220px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "#667085",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            margin: "0 auto 14px",
            borderRadius: "18px",
            background: "#eef4ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#19305c",
          }}
        >
          {icon}
        </div>

        <h3
          style={{
            margin: "0 0 8px",
            fontSize: "18px",
            fontWeight: 800,
            color: "#101828",
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#667085",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "14px 12px",
        fontSize: "14px",
        fontWeight: 700,
        color: "#475467",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td
      style={{
        textAlign: align,
        padding: "16px 12px",
        fontSize: "14px",
        color: "#101828",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function CollectionRateCell({ value }) {
  const numericValue = Number(value || 0);
  const safeValue = Math.max(0, Math.min(100, numericValue));
  const barColor = getCollectionBarColor(numericValue);

  return (
    <div
      style={{
        minWidth: "115px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "6px",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#475467",
          lineHeight: 1,
        }}
      >
        %{numericValue.toFixed(2)}
      </span>

      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#e5e7eb",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${safeValue}%`,
            height: "100%",
            background: barColor,
            borderRadius: "999px",
            transition: "width 0.3s ease",
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

const inputStyle = {
  height: "48px",
  border: "1px solid #d9e0ea",
  borderRadius: "14px",
  padding: "0 14px",
  fontSize: "14px",
  background: "#fff",
  color: "#111827",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};