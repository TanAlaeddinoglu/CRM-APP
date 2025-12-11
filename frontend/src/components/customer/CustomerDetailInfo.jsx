// src/components/customer/CustomerDetailInfo.jsx
export default function CustomerDetailInfo({ customer }) {
  return (
    <div className="customer-info-section">

      {/* CUSTOMER NAME */}
      <h2 className="customer-title">
        {customer.customer_name} {customer.customer_surname}
      </h2>

      {/* TAG (küçük, sade) */}
      {customer.tag && (
        <span className="customer-tag-mini">{customer.tag}</span>
      )}

      {/* INFO LIST */}
      <div className="info-list">
        <div className="info-item">
          <label>Email</label>
          <span>{customer.customer_email || "-"}</span>
        </div>

        <div className="info-item">
          <label>Telefon</label>
          <span>{customer.customer_phone || "-"}</span>
        </div>

        <div className="info-item">
          <label>Şehir</label>
          <span>{customer.city || "-"}</span>
        </div>

        <div className="info-item">
          <label>Durum</label>
          <span>{customer.status}</span>
        </div>

        <div className="info-item">
          <label>Atanan Kullanıcı</label>
          <span>{customer.assigned_to}</span>
        </div>

        <div className="info-item">
          <label>Oluşturulma Tarihi</label>
          <span>{new Date(customer.created_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
