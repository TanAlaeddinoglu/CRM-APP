// src/components/customer/events/EventItem.jsx
import React from "react";

const EventItem = ({ event, onClick }) => {
  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="event-row" onClick={onClick}>
      {/* Üst satır: 2 alt satır */}
      <div className="event-row-top">
        <div className="event-row-top-line1">
          <span className="event-row-date">{formatDateTime(event.scheduled_for)}</span>
          <span className="event-row-top-item">
            <span className="event-row-meta-label">Randevu Adı:</span>
            <span className="event-row-name">{event.name}</span>
          </span>
        </div>
        <div className="event-row-top-line2">
          <span className="event-row-top-item">
            <span className="event-row-meta-label">Randevu Türü:</span>
            <span className="event-row-type">{event.appointment_type}</span>
          </span>
          <span className="event-row-top-item">
            <span className="event-row-meta-label">Durum:</span>
            <span className={`event-row-status status-${event.status}`}>{event.status}</span>
          </span>
          {event.product && (
            <span className="event-row-top-item">
              <span className="event-row-meta-label">Hastalık:</span>
              <span className="event-row-type">{event.product}</span>
            </span>
          )}
        </div>
      </div>

      {/* Alt satır: güncelleyen, güncellenme tarihi */}
      <div className="event-row-bottom">
        {event.created_by && (
          <span className="event-row-meta-item">
            <span className="event-row-meta-label">Güncelleyen:</span>
            <span className="event-row-meta-value">{event.created_by}</span>
          </span>
        )}
        {event.updated_at && (
          <span className="event-row-meta-item">
            <span className="event-row-meta-label">Güncellenme Tarihi:</span>
            <span className="event-row-meta-value">{formatDate(event.updated_at)}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default EventItem;
