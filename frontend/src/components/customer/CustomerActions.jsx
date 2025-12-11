// src/components/customer/CustomerActions.jsx
export default function CustomerActions({ customer }) {
  return (
    <div className="customer-actions">
      <button className="btn-primary">
        + Create Appointment
      </button>

      <button className="btn-secondary">
        + Create Agreement
      </button>
    </div>
  );
}
