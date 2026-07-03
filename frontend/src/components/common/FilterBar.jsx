import { useState } from "react";
import { Filter, RefreshCcw } from "lucide-react";
import "./FilterBar.css";

/* =========================================================
   DATE RANGE helpers (used by FilterBar.DateRange)
========================================================= */
const PRESETS = [
  { key: "today",           label: "Bugün" },
  { key: "yesterday",       label: "Dün" },
  { key: "today_yesterday", label: "Bugün ve Dün" },
  { key: "last7",           label: "Son 7 Gün" },
  { key: "last14",          label: "Son 14 Gün" },
  { key: "last30",          label: "Son 30 Gün" },
  { key: "this_week",       label: "Bu Hafta" },
  { key: "last_week",       label: "Geçen Hafta" },
  { key: "this_month",      label: "Bu Ay" },
  { key: "last_month",      label: "Geçen Ay" },
];

const MAX_DAYS = 90;

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function thisMonday(base) {
  const d = new Date(base);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function computeDateRange(key) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shift = (n) => {
    const d = new Date(today);
    d.setDate(today.getDate() + n);
    return d;
  };

  switch (key) {
    case "today":
      return { dateFrom: toISO(today), dateTo: toISO(today) };
    case "yesterday": {
      const yd = shift(-1);
      return { dateFrom: toISO(yd), dateTo: toISO(yd) };
    }
    case "today_yesterday":
      return { dateFrom: toISO(shift(-1)), dateTo: toISO(today) };
    case "last7":
      return { dateFrom: toISO(shift(-6)), dateTo: toISO(today) };
    case "last14":
      return { dateFrom: toISO(shift(-13)), dateTo: toISO(today) };
    case "last30":
      return { dateFrom: toISO(shift(-29)), dateTo: toISO(today) };
    case "this_week": {
      const mon = thisMonday(today);
      return { dateFrom: toISO(mon), dateTo: toISO(today) };
    }
    case "last_week": {
      const thisMon = thisMonday(today);
      const lastMon = new Date(thisMon);
      lastMon.setDate(thisMon.getDate() - 7);
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastMon.getDate() + 6);
      return { dateFrom: toISO(lastMon), dateTo: toISO(lastSun) };
    }
    case "this_month": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: toISO(first), dateTo: toISO(today) };
    }
    case "last_month": {
      const firstOfThis = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastOfPrev  = new Date(firstOfThis);
      lastOfPrev.setDate(0);
      const firstOfPrev = new Date(lastOfPrev.getFullYear(), lastOfPrev.getMonth(), 1);
      return { dateFrom: toISO(firstOfPrev), dateTo: toISO(lastOfPrev) };
    }
    default:
      return { dateFrom: "", dateTo: "" };
  }
}

function diffDays(from, to) {
  return Math.round((new Date(to) - new Date(from)) / 86_400_000);
}

/* =========================================================
   FILTER BAR — pill container (listing pages)
========================================================= */
export default function FilterBar({ children, className = "" }) {
  return (
    <div className={`filter-bar ${className}`.trim()}>
      {children}
    </div>
  );
}

/* =========================================================
   FILTER BAR — panel/card container (reports pages)
========================================================= */
function Panel({ title, onSubmit, onReset, loading, children }) {
  return (
    <section className="filter-bar-panel">
      <div className="filter-bar-panel__header">
        <div className="filter-bar-panel__icon">
          <Filter size={18} />
        </div>
        <h2 className="filter-bar-panel__title">{title}</h2>
      </div>
      {children}
      <div className="filter-bar-panel__actions">
        <button
          type="button"
          className="btn-secondary filter-bar-action-btn"
          onClick={onReset}
        >
          <RefreshCcw size={16} />
          Temizle
        </button>
        <button
          type="button"
          className="btn-primary filter-bar-submit-btn"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "Yükleniyor..." : "Raporu Getir"}
        </button>
      </div>
    </section>
  );
}

/* Responsive grid inside Panel */
function Grid({ children }) {
  return <div className="filter-bar-grid">{children}</div>;
}

/* =========================================================
   SUB-COMPONENTS
========================================================= */

/* Plain text search — pill mode */
function Search({ value, onChange, placeholder = "Ara..." }) {
  return (
    <input
      type="text"
      className="filter-bar__search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

/* Select — pill mode (no label) OR panel mode (with label) */
function Select({ value, onChange, options, label, placeholder, ...rest }) {
  const select = (
    <select
      className={label ? "filter-bar__field-control" : "filter-bar__select"}
      value={value}
      onChange={onChange}
      {...rest}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  if (!label) return select;
  return (
    <label className="filter-bar__field">
      <span className="filter-bar__field-label">{label}</span>
      {select}
    </label>
  );
}

/* Single date input — panel mode (with label) OR standalone */
function DateInput({ label, ...props }) {
  const input = (
    <input
      type="date"
      className={label ? "filter-bar__field-control" : "filter-bar__date-input"}
      {...props}
    />
  );
  if (!label) return input;
  return (
    <label className="filter-bar__field">
      <span className="filter-bar__field-label">{label}</span>
      {input}
    </label>
  );
}

/* Combined preset dropdown + custom date range.
   - Pill mode (no label): rendered as a single inline pill.
   - Panel mode (with label): rendered as 3 separate equal-width labeled fields
     (preset select, date-from, date-to) so they sit alongside other panel fields. */
function DateRange({ value, onChange, placeholder = "Tarih Aralığı", label }) {
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [customError, setCustomError] = useState("");

  const handleSelect = (e) => {
    const key = e.target.value;
    setCustomFrom("");
    setCustomTo("");
    setCustomError("");
    const { dateFrom, dateTo } = computeDateRange(key);
    onChange(key, dateFrom, dateTo);
  };

  const handleCustomFrom = (e) => {
    const from = e.target.value;
    setCustomFrom(from);
    setCustomError("");
    if (from && customTo) {
      validateAndEmit(from, customTo);
    } else {
      onChange("custom", from, "");
    }
  };

  const handleCustomTo = (e) => {
    const to = e.target.value;
    setCustomTo(to);
    setCustomError("");
    if (customFrom && to) {
      validateAndEmit(customFrom, to);
    } else {
      onChange("custom", "", to);
    }
  };

  const validateAndEmit = (from, to) => {
    const diff = diffDays(from, to);
    if (diff < 0) {
      setCustomError("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }
    if (diff > MAX_DAYS) {
      setCustomError(`Aralık en fazla ${MAX_DAYS} gün olabilir.`);
      return;
    }
    setCustomError("");
    onChange("custom", from, to);
  };

  /* Panel mode — 3 separate equal-width labeled fields as a React Fragment */
  if (label) {
    return (
      <>
        <label className="filter-bar__field">
          <span className="filter-bar__field-label">{label}</span>
          <select
            className="filter-bar__field-control"
            value={value === "custom" ? "" : (value || "")}
            onChange={handleSelect}
          >
            <option value="">Aralık seç</option>
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="filter-bar__field">
          <span className="filter-bar__field-label">Başlangıç</span>
          <input
            type="date"
            className={`filter-bar__field-control${customError ? " filter-bar__field-control--error" : ""}`}
            value={customFrom}
            onChange={handleCustomFrom}
          />
        </label>

        <label className="filter-bar__field">
          <span className="filter-bar__field-label">Bitiş</span>
          <input
            type="date"
            className={`filter-bar__field-control${customError ? " filter-bar__field-control--error" : ""}`}
            value={customTo}
            onChange={handleCustomTo}
          />
          {customError && (
            <span className="filter-bar__field-error">{customError}</span>
          )}
        </label>
      </>
    );
  }

  /* Pill mode */
  return (
    <div className="date-range-dropdown date-range-dropdown--inline">
      <select
        className="date-range-dropdown__select"
        value={value === "custom" ? "" : (value || "")}
        onChange={handleSelect}
      >
        <option value="">{placeholder}</option>
        {PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      <div className="date-range-dropdown__custom">
        <input
          type="date"
          className={`date-range-dropdown__date-input${customError ? " date-range-dropdown__date-input--error" : ""}`}
          value={customFrom}
          onChange={handleCustomFrom}
        />
        <span className="date-range-dropdown__sep">—</span>
        <input
          type="date"
          className={`date-range-dropdown__date-input${customError ? " date-range-dropdown__date-input--error" : ""}`}
          value={customTo}
          onChange={handleCustomTo}
        />
        {customError && (
          <span className="date-range-dropdown__error">{customError}</span>
        )}
      </div>
    </div>
  );
}

/* Reset / clear button — pill mode */
function Reset({ onClick, label = "Filtreleri Temizle" }) {
  return (
    <button type="button" className="filter-bar__reset" onClick={onClick}>
      {label}
    </button>
  );
}

/* =========================================================
   ATTACH SUB-COMPONENTS
========================================================= */
FilterBar.Panel     = Panel;
FilterBar.Grid      = Grid;
FilterBar.Search    = Search;
FilterBar.Select    = Select;
FilterBar.DateInput = DateInput;
FilterBar.DateRange = DateRange;
FilterBar.Reset     = Reset;
