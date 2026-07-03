import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAppointments, updateAppointment, deleteAppointment } from "../services/appointment";
import AppointmentDetailModal from "../components/AppointmentDetailModal";
import EventModal from "../components/customer/events/EventModal.jsx";
import ExportActionButton from "../components/export/ExportActionButton.jsx";
import LoadingIndicator from "../components/common/LoadingIndicator.jsx";
import FilterBar from "../components/common/FilterBar.jsx";
import { useAuth } from "../context/AuthContext";
import { usePageTransition } from "../context/PageTransitionContext.jsx";
import { isAdmin } from "../utils/roles.js";
import { Upload } from "lucide-react";
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
  { value: "hatirlatma", label: "Hatırlatma" },
];

export default function AppointmentHistoryPage() {
  const { user } = useAuth();
  const canExportEvents = isAdmin(user);
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  usePageTransition(loading);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState(() => {
    const requestedType = location.state?.initialTypeFilter;
    return TYPE_OPTIONS.some((option) => option.value === requestedType)
      ? requestedType
      : "";
  });

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editAppointment, setEditAppointment] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [page, pageSize, statusFilter, typeFilter, dateFrom, dateTo, search, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, dateFrom, dateTo, search, pageSize]);

  useEffect(() => {
    const requestedType = location.state?.initialTypeFilter;
    if (!TYPE_OPTIONS.some((option) => option.value === requestedType)) {
      return;
    }

    setTypeFilter((current) => (current === requestedType ? current : requestedType));
  }, [location.state]);

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

        <div style={{ display: "flex", gap: "8px" }}>
          {canExportEvents && (
            <ExportActionButton
              model="events"
              initialRecipientEmail={user?.email || ""}
              buttonClassName="btn-secondary customer-action-icon-button"
              buttonLabel={<Upload size={18} strokeWidth={2} />}
              buttonTitle="Dışa Aktar"
              ariaLabel="Dışa Aktar"
            />
          )}
          <button
            className="btn-secondary"
            onClick={() => navigate("/events")}
          >
            ← Takvime Dön
          </button>
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}
      <FilterBar>
        <FilterBar.Search
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Randevu / müşteri ara"
        />
        <FilterBar.Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUS_OPTIONS}
        />
        <FilterBar.Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={TYPE_OPTIONS}
        />
        <FilterBar.DateRange
          value={datePreset}
          onChange={(key, from, to) => {
            setDatePreset(key);
            setDateFrom(from);
            setDateTo(to);
          }}
        />
        <FilterBar.Reset
          onClick={() => {
            setSearch("");
            setStatusFilter("");
            setTypeFilter("");
            setDateFrom("");
            setDateTo("");
            setDatePreset("");
          }}
        />
      </FilterBar>

        {/* ================= COUNT ================= */}
        <div className="result-count">
            {totalCount} kayıt bulundu
        </div>

        {/* ================= TABLE ================= */}
      {loading ? (
        <div className="appointment-empty">
          <LoadingIndicator inline label="Randevular yükleniyor" />
        </div>
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
        onEdit={(appt) => {
          setSelectedAppointment(null);
          setEditAppointment(appt);
          setShowEventModal(true);
        }}
      />

      {/* ================= EDIT MODAL ================= */}
      <EventModal
        isOpen={showEventModal}
        event={editAppointment}
        customerId={editAppointment?.customer_id}
        onClose={() => {
          setShowEventModal(false);
          setEditAppointment(null);
        }}
        onSave={(payload) =>
          updateAppointment(editAppointment.id, payload).then(() => {
            setShowEventModal(false);
            setEditAppointment(null);
            setRefreshKey((k) => k + 1);
          })
        }
        onDelete={(id) =>
          deleteAppointment(id).then(() => {
            setShowEventModal(false);
            setEditAppointment(null);
            setRefreshKey((k) => k + 1);
          })
        }
      />
    </div>
  );
}
