// src/components/customer/CustomerDetailInfo.jsx
// src/assets/css/CustomerDetailPage.css
import "../../assets/css/CustomerDetailPage.css";

export default function CustomerDetailInfo({ customer }) {
  if (!customer) return null;

  return (
    <div className="customer-info-card">
      <h2 className="section-title">Customer Information</h2>

      <div className="info-row">
        <label>Name:</label>
        <span>{customer.customer_name} {customer.customer_surname}</span>
      </div>

      <div className="info-row">
        <label>Email:</label>
        <span>{customer.customer_email || "—"}</span>
      </div>

      <div className="info-row">
        <label>Phone:</label>
        <span>{customer.customer_phone || "—"}</span>
      </div>

      <div className="info-row">
        <label>City:</label>
        <span>{customer.city || "—"}</span>
      </div>

      <div className="info-row">
        <label>Status:</label>
        <span>{customer.status}</span>
      </div>

      <div className="info-row">
        <label>Assigned To:</label>
        <span>{customer.assigned_to || "—"}</span>
      </div>

      <div className="info-row">
        <label>Created At:</label>
        <span>{new Date(customer.created_at).toLocaleString()}</span>
      </div>

      <div className="info-row">
        <label>Updated At:</label>
        <span>{new Date(customer.updated_at).toLocaleString()}</span>
      </div>
    </div>
  );
}
