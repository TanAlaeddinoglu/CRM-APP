// src/components/AppointmentCalendar.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import trLocale from "@fullcalendar/core/locales/tr";

import {
  getAppointments,
  updateAppointment,
  deleteAppointment,
} from "../services/appointment";

import AppointmentDetailModal from "./AppointmentDetailModal";
import EventModal from "../components/customer/events/EventModal.jsx";

import "../assets/css/AppointmentCalendar.css";

export default function AppointmentCalendar() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  /* =========================
     LOAD APPOINTMENTS
  ========================= */
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAppointments();
      setEvents(
        (res.data || []).map((a) => ({
          id: a.id,
          title: `${a.customer} • ${a.name}`,
          start: a.scheduled_for,
          extendedProps: a,
          backgroundColor:
            a.status === "satis"
              ? "#dcfce7"
              : a.status === "beklemede"
              ? "#e0f2fe"
              : "#fee2e2",
          textColor: "#111827",
          borderColor: "#e5e7eb",
        }))
      );
    } catch (err) {
      console.error("Load appointments error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  /* =========================
     EDIT FLOW
  ========================= */
  const openEditModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowEventModal(true);
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Takvim yükleniyor…</div>;
  }

  return (
    <div className="appointment-calendar-page">
      {/* ================= HEADER ================= */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h1 className="h1">Randevu Takvimi</h1>

        <button
          className="btn-secondary"
          onClick={() => navigate("/appointments/history")}
        >
          📋 Tüm Randevular
        </button>
      </div>

      {/* ================= CALENDAR ================= */}
      <div className="appointment-calendar-wrapper">
        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            listPlugin,
          ]}
          locale="tr"
          locales={[trLocale]}
          initialView="timeGridWeek"
          height="78vh"
          nowIndicator
          events={events}
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listMonth",
          }}
          eventClick={(info) => {
            setSelectedAppointment(info.event.extendedProps);
          }}
        />
      </div>

      {/* ================= DETAIL MODAL ================= */}
      <AppointmentDetailModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onEdit={(appt) => openEditModal(appt)}
        onUpdated={loadAppointments}
      />

      {/* ================= EVENT MODAL (EDIT) ================= */}
      <EventModal
        isOpen={showEventModal}
        event={selectedAppointment}
        customerId={selectedAppointment?.customer_id}
        onClose={() => {
          setShowEventModal(false);
          setSelectedAppointment(null);
        }}
        onSave={(payload) =>
          updateAppointment(selectedAppointment.id, payload).then(
            loadAppointments
          )
        }
        onDelete={(id) =>
          deleteAppointment(id).then(() => {
            setShowEventModal(false);
            setSelectedAppointment(null);
            loadAppointments();
          })
        }
      />
    </div>
  );
}
