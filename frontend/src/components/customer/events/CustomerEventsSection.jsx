import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../../../services/appointment";
import { toast } from "react-hot-toast";
import { usePageTransition } from "../../../context/PageTransitionContext.jsx";

import EventItem from "./EventItem";
import EventModal from "./EventModal";
import "./eventStyles.css";

const CustomerEventsSection = ({ customerId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageTransition(loading);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (!customerId) return;
    loadEvents();
  }, [customerId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await getAppointments({ customerId });
      const items = res.data?.results || res.data || [];
      setEvents(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Error loading events:", err);
      toast.error("Randevular yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedEvent(null);
    setModalOpen(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedEvent) {
        await updateAppointment(selectedEvent.id, data);
        toast.success("Randevu güncellendi.");
      } else {
        await createAppointment(data);
        toast.success("Randevu oluşturuldu.");
      }

      setModalOpen(false);
      await loadEvents();
    } catch (err) {
      console.error("Error saving event:", err);
      toast.error("Randevu kaydedilemedi.");
      throw err; // Modal'a iletilmesi için tekrar fırlatıyoruz
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAppointment(id);
      toast.success("Randevu silindi.");
      setModalOpen(false);
      await loadEvents();
    } catch (err) {
      console.error("Error deleting event:", err);
      toast.error("Randevu silinemedi.");
    }
  };

  return (
    <div className="events-container">
      <div className="events-header">
        <h3 className="events-title">Randevular</h3>
        <button
          className="btn-primary customer-action-icon-button"
          onClick={handleCreateClick}
          title="Randevu Ekle"
          aria-label="Randevu Ekle"
          type="button"
        >
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="events-list">
        {loading ? (
          <div className="event-skeleton">Yükleniyor...</div>
        ) : events.length === 0 ? (
          <div className="events-empty">Bu müşteri için henüz randevu yok.</div>
        ) : (
          events.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              onClick={() => handleEventClick(event)}
            />
          ))
        )}
      </div>

      {modalOpen && (
        <EventModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
          event={selectedEvent}
          customerId={customerId}
        />
      )}
    </div>
  );
};

export default CustomerEventsSection;
