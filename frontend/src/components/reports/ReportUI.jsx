import React from "react";
import { Filter, RefreshCcw, RotateCcw } from "lucide-react";
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

export function SortableReportTable({
  columns,
  rows,
  emptyText,
  defaultSort = null,
  resetLabel = "Sıralamayı sıfırla",
  showReset = true,
  minWidth,
}) {
  const initialSort = defaultSort || {
    key: columns[0]?.key,
    direction: "asc",
  };
  const [sortConfig, setSortConfig] = React.useState(initialSort);

  const sortedRows = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      const column = columns.find((item) => item.key === sortConfig.key);
      const direction = sortConfig.direction === "asc" ? 1 : -1;

      if (column?.type === "text") {
        return (
          String(a?.[sortConfig.key] || "").localeCompare(
            String(b?.[sortConfig.key] || ""),
            "tr",
            { sensitivity: "base" }
          ) * direction
        );
      }

      const left = Number(a?.[sortConfig.key] || 0);
      const right = Number(b?.[sortConfig.key] || 0);

      if (left === right) {
        return String(a?.[columns[0]?.key] || "").localeCompare(
          String(b?.[columns[0]?.key] || ""),
          "tr",
          { sensitivity: "base" }
        );
      }

      return (left - right) * direction;
    });
  }, [columns, rows, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const resetSort = () => {
    setSortConfig(initialSort);
  };

  if (!rows.length) {
    return (
      <div className="reports-table-empty">
        {emptyText}
      </div>
    );
  }

  return (
    <div>
      {showReset && (
        <div className="reports-sortable-table__actions">
          <button
            type="button"
            className="reports-sort-reset"
            onClick={resetSort}
            title="Varsayılan sıralamaya dön"
          >
            <RotateCcw size={14} />
            {resetLabel}
          </button>
        </div>
      )}

      <div className="reports-table-wrap">
        <table
          className="reports-table reports-table--fixed"
          style={minWidth ? { minWidth } : undefined}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.align === "right" ? "reports-table-header--right" : ""}
                >
                  <SortableHeaderButton
                    column={column}
                    active={sortConfig.key === column.key}
                    direction={sortConfig.direction}
                    onClick={() => handleSort(column.key)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <tr key={row.id || `${index}-${row[columns[0]?.key]}`}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={[
                      column.truncate ? "reports-table-cell--truncate" : "",
                      column.align === "right" ? "reports-table-cell--right" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {column.render
                      ? column.render(row, index)
                      : renderCellValue(column.key, row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ChartAxisTick({
  x,
  y,
  payload,
  maxLineLength = 14,
  maxLines = 2,
}) {
  const lines = splitAxisLabel(payload?.value, maxLineLength, maxLines);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill="#64748b"
        fontSize={12}
        fontWeight={600}
      >
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 12 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function SortableHeaderButton({ column, active, direction, onClick }) {
  const arrow = active ? (direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <button
      type="button"
      className={`reports-sort-header ${active ? "reports-sort-header--active" : ""}`}
      onClick={onClick}
      title={`${column.label} sıralama`}
    >
      <span>{column.label}</span>
      <span aria-hidden="true" className="reports-sort-header__icon">
        {arrow}
      </span>
    </button>
  );
}

function splitAxisLabel(value, maxLineLength, maxLines) {
  const label = String(value || "-").trim();
  if (label.length <= maxLineLength) {
    return [label];
  }

  const words = label.split(/\s+/);
  if (words.length === 1) {
    return [truncateAxisLabel(label, maxLineLength)];
  }

  const lines = [];

  words.forEach((word) => {
    const currentLine = lines[lines.length - 1] || "";

    if (!currentLine) {
      lines.push(word);
      return;
    }

    if (`${currentLine} ${word}`.length <= maxLineLength) {
      lines[lines.length - 1] = `${currentLine} ${word}`;
      return;
    }

    lines.push(word);
  });

  const normalizedLines = lines.flatMap((line) => {
    if (line.length <= maxLineLength) {
      return [line];
    }

    return [truncateAxisLabel(line, maxLineLength)];
  });

  if (normalizedLines.length <= maxLines) {
    return normalizedLines;
  }

  const visibleLines = normalizedLines.slice(0, maxLines);
  const lastIndex = visibleLines.length - 1;
  visibleLines[lastIndex] = `${visibleLines[lastIndex].slice(0, maxLineLength - 3)}...`;

  return visibleLines;
}

function truncateAxisLabel(label, maxLength) {
  if (label.length <= maxLength) {
    return label;
  }

  return `${label.slice(0, Math.max(1, maxLength - 3))}...`;
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
