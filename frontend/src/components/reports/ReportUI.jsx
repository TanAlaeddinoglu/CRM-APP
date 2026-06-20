import React, { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { formatMetric, renderCellValue } from "../../utils/reportUtils";

const KPI_MIN_WIDTH = 140;
const KPI_GAP = 12;

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
  const containerRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(KPI_MIN_WIDTH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const calculate = (width) => {
      const count = items.length;
      if (count === 0) return;
      const fit = Math.floor((width + KPI_GAP) / (KPI_MIN_WIDTH + KPI_GAP));
      const visible = Math.max(1, Math.min(fit, count));
      const w = (width - (visible - 1) * KPI_GAP) / visible;
      setCardWidth(Math.floor(w));
    };

    const ro = new ResizeObserver((entries) => {
      calculate(entries[0].contentRect.width);
    });
    ro.observe(el);
    calculate(el.getBoundingClientRect().width);

    return () => ro.disconnect();
  }, [items.length]);

  return (
    <div ref={containerRef} className="reports-kpi-scroll">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="reports-kpi-card"
          style={{ flex: `0 0 ${cardWidth}px`, minWidth: `${cardWidth}px` }}
        >
          <div className="reports-kpi-card__label">{label}</div>
          <div className="reports-kpi-card__value">{formatMetric(label, value)}</div>
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

export function SortableTableCard({ title, columns, rows, emptyText, defaultSort, showReset = true, minWidth, footer }) {
  const initialSort = defaultSort || { key: columns[0]?.key, direction: "asc" };
  const [sortConfig, setSortConfig] = React.useState(initialSort);

  return (
    <section className="reports-card">
      <div className="reports-card__header">
        <h3 className="reports-card__title">{title}</h3>
        {showReset && rows.length > 0 && (
          <button
            type="button"
            className="reports-sort-reset"
            onClick={() => setSortConfig(initialSort)}
            title="Varsayılan sıralamaya dön"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
      <SortableReportTable
        columns={columns}
        rows={rows}
        emptyText={emptyText}
        defaultSort={defaultSort}
        showReset={false}
        minWidth={minWidth}
        sortConfig={sortConfig}
        onSort={setSortConfig}
      />
      {footer}
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
              <th key={column.key} className={`reports-table-header--${colAlign(column)}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.day || `${index}-${row[columns[0].key]}`}>
              {columns.map((column) => (
                <td key={column.key} className={`reports-table-cell--${colAlign(column)}`}>
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
  showReset = true,
  minWidth,
  sortConfig: externalSortConfig,
  onSort: externalOnSort,
}) {
  const initialSort = defaultSort || {
    key: columns[0]?.key,
    direction: "asc",
  };
  const [internalSortConfig, setInternalSortConfig] = React.useState(initialSort);

  const isControlled = externalSortConfig !== undefined;
  const sortConfig = isControlled ? externalSortConfig : internalSortConfig;
  const setSortConfig = isControlled ? externalOnSort : setInternalSortConfig;

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
      {showReset && !isControlled && (
        <div className="reports-sortable-table__actions">
          <button
            type="button"
            className="reports-sort-reset"
            onClick={resetSort}
            title="Varsayılan sıralamaya dön"
          >
            <RotateCcw size={14} />
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
                <th key={column.key} className={`reports-table-header--${colAlign(column)}`}>
                  <SortableHeaderButton
                    column={column}
                    align={colAlign(column)}
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
                      `reports-table-cell--${colAlign(column)}`,
                    ].filter(Boolean).join(" ")}
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

function SortableHeaderButton({ column, align, active, direction, onClick }) {
  const arrow = active ? (direction === "asc" ? "↑" : "↓") : "↕";
  const centered = align === "right";

  return (
    <button
      type="button"
      className={[
        "reports-sort-header",
        centered ? "reports-sort-header--center" : "",
        active ? "reports-sort-header--active" : "",
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      title={column.label}
    >
      <span className="reports-sort-header__label">{column.label}</span>
      <span aria-hidden="true" className="reports-sort-header__icon">
        {arrow}
      </span>
    </button>
  );
}

function colAlign(column) {
  if (column.align) return column.align;
  return column.type === "number" ? "right" : "left";
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
