// src/components/AppointmentCalendar.jsx
import { useEffect, useState, useCallback, useRef } from "react";
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
  const [showReminders, setShowReminders] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editAppointment, setEditAppointment] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const calendarRef = useRef(null);
  const lastViewRef = useRef("timeGridWeek");
  const lastDateRef = useRef(null);
  const viewRangeRef = useRef({ start: null, end: null });
  const [timeBounds, setTimeBounds] = useState({
    min: "06:00:00",
    max: "21:00:00",
  });

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  /* =========================
     LOAD APPOINTMENTS
  ========================= */
  const updateTimeBounds = useCallback((list, range) => {
    if (!range?.start || !range?.end) return;
    const hasOffHours = list.some((e) => {
      if (!e.start) return false;
      const d = new Date(e.start);
      if (Number.isNaN(d.getTime())) return false;
      if (d < range.start || d >= range.end) return false;
      const hour = d.getHours();
      return hour < 6 || hour >= 20;
    });
    const next = hasOffHours
      ? { min: "00:00:00", max: "24:00:00" }
      : { min: "06:00:00", max: "21:00:00" };
    setTimeBounds((prev) =>
      prev.min === next.min && prev.max === next.max ? prev : next
    );
  }, []);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = showReminders
        ? { appointmentType: "hatirlatma", page_size: 1000 }
        : { page_size: 1000 };
      const res = await getAppointments(params);
      const items = res.data?.results || res.data || [];
      const list = items.map((a) => ({
          id: a.id,
          title: [a.customer, a.name].filter(Boolean).join(" • ") || "Randevu",
          start: a.scheduled_for,
          extendedProps: a,
          backgroundColor:
            a.status === "satis"
              ? "#dcfce7"
              : a.status === "beklemede"
              ? "#e0f2fe"
              : a.status === "hatirlatma"
              ? "#cffafe"
              : "#fee2e2",
          textColor: "#111827",
          borderColor: "#e5e7eb",
        }));
      const filtered = showReminders
        ? list.filter((e) => e.extendedProps?.appointment_type === "hatirlatma")
        : list.filter((e) => e.extendedProps?.appointment_type !== "hatirlatma");
      setEvents(filtered);
      updateTimeBounds(filtered, viewRangeRef.current);
    } catch (err) {
      console.error("Load appointments error:", err);
    } finally {
      setLoading(false);
    }
  }, [showReminders]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  /* =========================
     EDIT FLOW
  ========================= */
  const openEditModal = (appointment) => {
    setSelectedAppointment(null);
    setEditAppointment(appointment);
    setShowEventModal(true);
  };

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api || !lastViewRef.current) return;
    if (api.view.type !== lastViewRef.current) {
      const targetDate = lastDateRef.current || api.getDate();
      api.changeView(lastViewRef.current, targetDate);
    }
  }, [selectedAppointment, showEventModal]);

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
        <h1 className="h1">
          {showReminders ? "Hatırlatıcı Takvimi" : "Randevu Takvimi"}
        </h1>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={showReminders ? "btn-primary" : "btn-secondary"}
            onClick={() => setShowReminders((prev) => !prev)}
          >
            Hatırlatıcı
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate("/appointments/history")}
          >
            📋 Tüm Randevular
          </button>
        </div>
      </div>

      {/* ================= CALENDAR ================= */}
      <div className="appointment-calendar-wrapper">
        {loading && (
          <div style={{ padding: "8px 4px", color: "#6b7280" }}>
            Takvim güncelleniyor…
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
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
          scrollTimeReset={false}
          slotMinTime={timeBounds.min}
          slotMaxTime={timeBounds.max}
          events={events}
          datesSet={(info) => {
            lastViewRef.current = info.view.type;
            lastDateRef.current = info.view.calendar.getDate();
            viewRangeRef.current = {
              start: info.view.activeStart,
              end: info.view.activeEnd,
            };
            updateTimeBounds(events, viewRangeRef.current);
          }}
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listMonth",
          }}
          eventContent={(arg) => {
            const props = arg.event.extendedProps || {};
            const title =
              arg.event.title ||
              [props.customer, props.name].filter(Boolean).join(" • ");
            if (!arg.view.type.startsWith("list")) {
              const timeHtml = arg.timeText
                ? `<div class="fc-event-time">${escapeHtml(arg.timeText)}</div>`
                : "";
              const titleHtml = `<div class="fc-event-title">${escapeHtml(
                title || "Randevu"
              )}</div>`;
              return { html: `${timeHtml}${titleHtml}` };
            }
            const lineParts = [
              `<strong>${escapeHtml(props.customer || "")}</strong>`,
              escapeHtml(props.name || ""),
              `Ürün: ${escapeHtml(props.product || "-")}`,
              `Tür: ${escapeHtml(props.appointment_type || "-")}`,
              `Durum: ${escapeHtml(props.status || "-")}`,
            ];
            if (props.notes) {
              lineParts.push(`Not: ${escapeHtml(props.notes)}`);
            }
            return {
              html: `<div class="fc-list-item-title">${lineParts.join(" • ")}</div>`,
            };
          }}
          eventClick={(info) => {
            lastViewRef.current = info.view.type;
            lastDateRef.current = info.view.calendar.getDate();
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
        event={editAppointment}
        customerId={editAppointment?.customer_id}
        onClose={() => {
          setShowEventModal(false);
          setEditAppointment(null);
        }}
        onSave={(payload) =>
          updateAppointment(editAppointment.id, payload).then((res) => {
            const api = calendarRef.current?.getApi?.();
            const nextDate = res?.data?.scheduled_for;
            loadAppointments();
            if (api && nextDate) {
              api.gotoDate(nextDate);
            }
          })
        }
        onDelete={(id) =>
          deleteAppointment(id).then(() => {
            setShowEventModal(false);
            setEditAppointment(null);
            loadAppointments();
          })
        }
      />
    </div>
  );
}
