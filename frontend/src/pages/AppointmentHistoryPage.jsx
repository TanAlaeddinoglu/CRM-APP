import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAppointments } from "../services/appointment";
import AppointmentDetailModal from "../components/AppointmentDetailModal";
import "../assets/css/AppointmentHistory.css";

const STATUS_OPTIONS = [
  { value: "", label: "Tüm Durumlar" },
  { value: "beklemede", label: "Beklemede" },
  { value: "satis", label: "Satış" },
  { value: "olumsuz", label: "Olumsuz" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Tüm Türler" },
  { value: "muayene", label: "Muayene" },
  { value: "ameliyat", label: "Ameliyat" },
  { value: "tedavi", label: "Tedavi" },
  { value: "hatirlatma", label: "Hatirlatma" },
];

export default function AppointmentHistoryPage() {
  const [appointments, setAppointments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [selectedAppointment, setSelectedAppointment] =
    useState(null);

  const navigate = useNavigate();

  /* =========================
     LOAD DATA
  ========================= */
  useEffect(() => {
    setLoading(true);
    const params = {
      page,
      page_size: pageSize,
    };
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.appointmentType = typeFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (search) params.search = search;

    getAppointments(params)
      .then((res) => {
        setAppointments(res.data?.results || []);
        setTotalCount(res.data?.count || 0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, statusFilter, typeFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, dateFrom, dateTo, search, pageSize]);

  /* =========================
     QUICK FILTERS
  ========================= */
  const applyTodayFilter = () => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    setDateFrom(iso);
    setDateTo(iso);
  };

  const applyWeekFilter = () => {
    const now = new Date();

    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1); // Pazartesi
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(end.toISOString().slice(0, 10));
  };

  /* =========================
     FILTER + SORT
  ========================= */
  const rows = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(b.scheduled_for) - new Date(a.scheduled_for)
      ),
    [appointments]
  );

  return (
    <div className="appointment-page-wrapper">
      {/* ================= HEADER ================= */}
      <div className="page-header">
        <h1 className="h1">Randevu Listesi</h1>

        <button
          className="btn-secondary"
          onClick={() => navigate("/events")}
        >
          ← Takvime Dön
        </button>
      </div>

      {/* ================= FILTER BAR ================= */}
        <div className="filter-bar">
            <input
                type="text"
                placeholder="Randevu / müşteri ara"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
            >
                {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                        {s.label}
                    </option>
                ))}
            </select>

            <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
            >
                {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                        {t.label}
                    </option>
                ))}
            </select>

            <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
            />

            <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
            />

            {/* QUICK FILTERS */}
            <button
                className="btn-ghost"
                onClick={applyTodayFilter}
            >
                Bugün
            </button>

            <button
                className="btn-ghost"
                onClick={applyWeekFilter}
            >
                Bu Hafta
            </button>
            <button
                className="btn-reset"
                onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setTypeFilter("");
                    setDateFrom("");
                    setDateTo("");
                }}
            >
                Filtreleri Temizle
            </button>

        </div>

        {/* ================= COUNT ================= */}
        <div className="result-count">
            {totalCount} kayıt bulundu
        </div>

        {/* ================= TABLE ================= */}
      {loading ? (
        <div className="appointment-empty">Yükleniyor…</div>
      ) : rows.length === 0 ? (
        <div className="appointment-empty">
          Kayıt bulunamadı.
        </div>
      ) : (
        <table className="appointment-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Müşteri</th>
              <th>Randevu</th>
              <th>Tür</th>
              <th>Durum</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((a) => (
              <tr
                key={a.id}
                className="appointment-row"
                onClick={() => setSelectedAppointment(a)}
              >
                <td>
                  {new Date(a.scheduled_for).toLocaleString(
                    "tr-TR"
                  )}
                </td>
                <td>{a.customer}</td>
                <td>{a.name}</td>
                <td>{a.appointment_type}</td>
                <td>
                  <span
                    className={`status-badge ${a.status}`}
                  >
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ================= PAGINATION ================= */}
      <div className="pagination-bar">
        <span style={{ color: "#6b7280", fontSize: "12px" }}>
          Sayfa {page} / {Math.max(1, Math.ceil(totalCount / pageSize))}
        </span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}/sayfa
            </option>
          ))}
        </select>
        <button
          className="btn-ghost"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Önceki
        </button>
        <button
          className="btn-ghost"
          disabled={page >= Math.ceil(totalCount / pageSize)}
          onClick={() =>
            setPage((p) => Math.min(p + 1, Math.ceil(totalCount / pageSize)))
          }
        >
          Sonraki
        </button>
      </div>

      {/* ================= DETAIL MODAL ================= */}
      <AppointmentDetailModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
      />
    </div>
  );
}
