import React from "react";
import { Filter, RefreshCcw } from "lucide-react";
import { formatMetric, renderCellValue } from "./reportUtils";

const fieldStyle = {
  height: "46px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  padding: "0 12px",
  fontSize: "14px",
  color: "#0f172a",
  background: "#fff",
  width: "100%",
};

export function TabButton({ active, onClick, label, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: "46px",
        padding: "0 16px",
        borderRadius: "14px",
        border: active ? "1px solid #0f254f" : "1px solid #dbe3ef",
        background: active ? "#0f254f" : "#ffffff",
        color: active ? "#ffffff" : "#0f172a",
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

export function FilterPanel({ title, onSubmit, onReset, loading, children }) {
  return (
    <section
      style={{
        background: "#ffffff",
        borderRadius: "22px",
        padding: "22px",
        border: "1px solid #e6edf5",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
        display: "grid",
        gap: "18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "14px",
            background: "#eef5fc",
            color: "#0f254f",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Filter size={18} />
        </div>

        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
          {title}
        </h2>
      </div>

      {children}

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          className="btn-secondary"
          onClick={onReset}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <RefreshCcw size={16} />
          Temizle
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={onSubmit}
          disabled={loading}
          style={{ minWidth: "140px" }}
        >
          {loading ? "Yükleniyor..." : "Raporu Getir"}
        </button>
      </div>
    </section>
  );
}

export function FilterGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "14px",
      }}
    >
      {children}
    </div>
  );
}

export function EmptyReportState({ title, description, icon }) {
  return (
    <section
      style={{
        background: "#ffffff",
        borderRadius: "22px",
        padding: "28px",
        border: "1px solid #e6edf5",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "58px",
          height: "58px",
          borderRadius: "18px",
          margin: "0 auto 14px",
          display: "grid",
          placeItems: "center",
          background: "#f1f7fd",
          color: "#0f254f",
        }}
      >
        {icon}
      </div>

      <h3 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>
        {title}
      </h3>
      <p
        style={{
          margin: "10px auto 0",
          maxWidth: "620px",
          color: "#64748b",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </section>
  );
}

export function KpiGrid({ items }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "14px",
      }}
    >
      {items.map(([label, value]) => (
        <div
          key={label}
          style={{
            background: "#ffffff",
            border: "1px solid #e5ecf3",
            borderRadius: "18px",
            padding: "16px",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.03)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: "4px",
              background: "#0f254f",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              color: "#64748b",
              fontSize: "12px",
              marginBottom: "10px",
              paddingLeft: "8px",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "#0f172a",
              paddingLeft: "8px",
            }}
          >
            {formatMetric(label, value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TwoColumnGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "16px",
      }}
    >
      {children}
    </div>
  );
}

export function ReportCard({ title, children }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e6edf5",
        borderRadius: "20px",
        padding: "18px",
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
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
      <div style={{ display: "grid", gap: "12px" }}>
        {rows.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "14px",
              paddingBottom: "10px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ color: "#64748b", fontSize: "14px" }}>{label}</span>
            <strong
              style={{
                color: "#0f172a",
                fontSize: "14px",
                textAlign: "right",
              }}
            >
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
        {emptyText}
      </div>
    );
  }

  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid #eef2f7",
        borderRadius: "16px",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  textAlign: "left",
                  padding: "14px",
                  borderBottom: "1px solid #e6edf5",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.day || `${index}-${row[columns[0].key]}`}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: "14px",
                    borderBottom:
                      index === rows.length - 1 ? "none" : "1px solid #f1f5f9",
                    color: "#0f172a",
                    fontSize: "14px",
                    whiteSpace: "nowrap",
                  }}
                >
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
    <label style={{ display: "grid", gap: "8px" }}>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>
        {label}
      </span>
      <input {...props} style={fieldStyle} />
    </label>
  );
}

export function SelectField({ label, options, placeholder, ...props }) {
  return (
    <label style={{ display: "grid", gap: "8px" }}>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>
        {label}
      </span>
      <select {...props} style={fieldStyle}>
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
