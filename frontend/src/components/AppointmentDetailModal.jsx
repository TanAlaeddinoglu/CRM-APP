import React from "react";

export default function AppointmentDetailModal({
  appointment,
  onClose,
  onEdit,
}) {
  if (!appointment) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Randevu Detayı</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <Detail label="Müşteri">
            {appointment.customer}
          </Detail>

          {appointment.customer_phone && (
            <Detail label="Telefon">
              {appointment.customer_phone}
            </Detail>
          )}

          <Detail label="Randevu Adı">
            {appointment.name}
          </Detail>

          <Detail label="Ürün / İşlem">
            {appointment.product}
          </Detail>

          <Detail label="Tür">
            {appointment.appointment_type}
          </Detail>

          <Detail label="Durum">
            <span className={`payment-status ${appointment.status}`}>
              {appointment.status}
            </span>
          </Detail>

          <Detail label="Tarih / Saat">
            {new Date(appointment.scheduled_for).toLocaleString("tr-TR")}
          </Detail>

          {appointment.notes && (
            <Detail label="Not">
              {appointment.notes}
            </Detail>
          )}
        </div>

        <div
          className="modal-footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <button
            className="btn-secondary"
            onClick={() => {
              onClose();
              onEdit(appointment);
            }}
          >
            Randevu Güncelle
          </button>

          <button className="btn-secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          fontSize: "12px",
          color: "#6b7280",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "#111827",
        }}
      >
        {children}
      </div>
    </div>
  );
}