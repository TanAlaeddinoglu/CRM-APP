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

export default function AppointmentHistoryPage() {
  const [appointments, setAppointments] = useState([]);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedAppointment, setSelectedAppointment] =
    useState(null);

  const navigate = useNavigate();

  /* =========================
     LOAD DATA
  ========================= */
  useEffect(() => {
    getAppointments().then((res) => {
      setAppointments(res.data || []);
    });
  }, []);

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
  const rows = useMemo(() => {
    return appointments
      .filter((a) => {
        // TEXT
        if (search) {
          const s = search.toLowerCase();
          if (
            !a.name?.toLowerCase().includes(s) &&
            !a.customer?.toLowerCase().includes(s)
          ) {
            return false;
          }
        }

        // STATUS
        if (statusFilter && a.status !== statusFilter) {
          return false;
        }

        const d = new Date(a.scheduled_for);

        // DATE FROM
        if (dateFrom && d < new Date(dateFrom)) return false;

        // DATE TO
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.scheduled_for) -
          new Date(a.scheduled_for)
      );
  }, [
    appointments,
    search,
    dateFrom,
    dateTo,
    statusFilter,
  ]);

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
                    setDateFrom("");
                    setDateTo("");
                }}
            >
                Filtreleri Temizle
            </button>

        </div>

        {/* ================= COUNT ================= */}
        <div className="result-count">
            {rows.length} kayıt bulundu
        </div>

        {/* ================= TABLE ================= */}
      {rows.length === 0 ? (
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

      {/* ================= DETAIL MODAL ================= */}
      <AppointmentDetailModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
      />
    </div>
  );
}
