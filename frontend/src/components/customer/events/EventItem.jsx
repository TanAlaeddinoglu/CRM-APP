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

  const formatShortText = (text, max = 20) => {
    if (!text) return "-";
    if (text.length <= max) return text;
    return text.slice(0, max) + "...";
  };

  return (
    <div className="event-row" onClick={onClick}>
      <span className="event-row-main">
        {/* Tarih & Saat */}
        <span className="event-row-date">
          {formatDateTime(event.scheduled_for)}
        </span>

        {/* Tür */}
        <span className="event-row-divider">—</span>
        <span className="event-row-type">{event.appointment_type}</span>

        {/* Durum */}
        <span className="event-row-divider">—</span>
        <span className={`event-row-status status-${event.status}`}>
          {event.status}
        </span>

        {/* İsim */}
        <span className="event-row-divider">—</span>
        <span className="event-row-name">{event.name}</span>

        {/* Ürün */}
        {event.product && (
          <>
            <span className="event-row-divider">—</span>
            <span className="event-row-product">{event.product}</span>
          </>
        )}

        {/* Created by / Updated at / Note */}
        <span className="event-row-meta">
          {" • "}
          {event.created_by && (
            <span>by {event.created_by}</span>
          )}
          {event.updated_at && (
            <span>
              {" "}| upd {formatDateTime(event.updated_at)}
            </span>
          )}
          {event.notes && (
            <span>
              {" "}| note: {formatShortText(event.notes, 25)}
            </span>
          )}
        </span>
      </span>
    </div>
  );
};

export default EventItem;
