import React from "react";
import { Filter, RefreshCcw } from "lucide-react";
import { formatMetric, renderCellValue } from "../../utils/reportUtils";

export function TabButton({ active, onClick, label, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`reports-tab ${active ? "reports-tab--active" : ""}`}
    >
      {React.createElement(Icon, { size: 18 })}
      <span>{label}</span>
    </button>
  );
}

export function FilterPanel({ title, onSubmit, onReset, loading, children }) {
  return (
    <section className="reports-filter-panel">
      <div className="reports-filter-panel__header">
        <div className="reports-filter-panel__icon">
          <Filter size={18} />
        </div>

        <h2 className="reports-filter-panel__title">
          {title}
        </h2>
      </div>

      {children}

      <div className="reports-filter-panel__actions">
        <button
          type="button"
          className="btn-secondary reports-action-button"
          onClick={onReset}
        >
          <RefreshCcw size={16} />
          Temizle
        </button>

        <button
          type="button"
          className="btn-primary reports-submit-button"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "Yükleniyor..." : "Raporu Getir"}
        </button>
      </div>
    </section>
  );
}

export function FilterGrid({ children }) {
  return <div className="reports-filter-grid">{children}</div>;
}

export function EmptyReportState({ title, description, icon }) {
  return (
    <section className="reports-empty-state">
      <div className="reports-empty-state__icon">
        {icon}
      </div>

      <h3 className="reports-empty-state__title">
        {title}
      </h3>
      <p className="reports-empty-state__description">
        {description}
      </p>
    </section>
  );
}

export function KpiGrid({ items }) {
  return (
    <div className="reports-kpi-grid">
      {items.map(([label, value]) => (
        <div key={label} className="reports-kpi-card">
          <div className="reports-kpi-card__label">
            {label}
          </div>
          <div className="reports-kpi-card__value">
            {formatMetric(label, value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TwoColumnGrid({ children }) {
  return <div className="reports-two-column-grid">{children}</div>;
}

export function ReportCard({ title, children }) {
  return (
    <section className="reports-card">
      <div className="reports-card__header">
        <h3 className="reports-card__title">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

export function InfoCard({ title, rows }) {
  return (
    <ReportCard title={title}>
      <div className="reports-info-list">
        {rows.map(([label, value]) => (
          <div key={label} className="reports-info-row">
            <span className="reports-info-row__label">{label}</span>
            <strong className="reports-info-row__value">
              {value ?? "-"}
            </strong>
          </div>
        ))}
      </div>
    </ReportCard>
  );
}

export function SimpleTable({ columns, rows, emptyText }) {
  if (!rows.length) {
    return (
      <div className="reports-table-empty">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="reports-table-wrap">
      <table className="reports-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.day || `${index}-${row[columns[0].key]}`}>
              {columns.map((column) => (
                <td key={column.key}>
                  {renderCellValue(column.key, row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InputField({ label, ...props }) {
  return (
    <label className="reports-field">
      <span className="reports-field__label">
        {label}
      </span>
      <input {...props} className="reports-field__control" />
    </label>
  );
}

export function SelectField({ label, options, placeholder, ...props }) {
  return (
    <label className="reports-field">
      <span className="reports-field__label">
        {label}
      </span>
      <select {...props} className="reports-field__control">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
