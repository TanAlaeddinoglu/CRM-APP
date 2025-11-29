// src/components/AppointmentCalendar.jsx
import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import trLocale from "@fullcalendar/core/locales/tr";

import { getAppointments } from "../services/appointment";
import "../assets/css/AppointmentCalendar.css";

export default function AppointmentCalendar({ onEventClick, onSlotSelect }) {
  const [events, setEvents] = useState([]);

  const loadAppointments = async () => {
    try {
      const res = await getAppointments();

      setEvents(
        res.data.map((a) => ({
          id: a.id,
          title: a.name,
          start: a.scheduled_for,
          extendedProps: a,
          backgroundColor:
            a.status === "satis"
              ? "#16a34a"
              : a.status === "beklemede"
              ? "#3b82f6"
              : "#ef4444",
          borderColor: "#1f2937",
          textColor: "#ffffff",
        }))
      );
    } catch (err) {
      console.error("Load appointments error:", err);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      initialView="timeGridWeek"
      locales={[trLocale]}
      locale="tr"
      height="80vh"
      selectable={true}
      editable={false}
      slotMinTime="07:00:00"
      slotMaxTime="22:00:00"
      slotDuration="00:30:00"
      events={events}
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
      }}
      /* Başlık formatı (üstteki büyük tarih) */
      titleFormat={{ month: "long", year: "numeric" }}

      /* Saat çizgileri 24 saat ve küçük */
      slotLabelFormat={{
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }}

      /* Görünümlere göre gün başlığı formatı */
      views={{
        dayGridMonth: {
          // Ay görünümü: sadece gün isimleri (Pzt, Sal vs.)
          dayHeaderFormat: { weekday: "short" },
        },
        timeGridWeek: {
          // Hafta görünümü: Gün ismi + DD/MM
          dayHeaderFormat: {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          },
        },
        timeGridDay: {
          dayHeaderFormat: {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          },
        },
        listWeek: {
          listDayFormat: {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          },
        },
      }}

      /* Gün tıklanınca: ileride slot seçimi için kullanırız */
      dateClick={(info) => {
        if (onSlotSelect) {
          onSlotSelect(info);
        } else {
          // şimdilik sadece konsola yaz
          console.log("Date clicked:", info.dateStr);
        }
      }}

      /* Event tıklanınca: detay */
      eventClick={(info) => {
        const appt = info.event.extendedProps;

        if (onEventClick) {
          onEventClick(appt);
        } else {
          // Şimdilik basit bir detay gösterelim
          alert(
            `Appointment: ${appt.name}\n` +
              `Status: ${appt.status}\n` +
              `Customer ID: ${appt.customer}\n` +
              `Product ID: ${appt.product}\n` +
              `Date: ${new Date(appt.scheduled_for).toLocaleString("tr-TR")}`
          );
        }
      }}
    />
  );
}
