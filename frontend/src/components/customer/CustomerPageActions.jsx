// src/components/customer/CustomerPageActions.jsx
import React from "react";
import "../../assets/css/CustomerActions.css";

export default function CustomerPageActions({
  onOpenFilter,
  onOpenCreate,
}) {
  return (
    <div className="customer-actions">
      <div className="customer-actions-left">
        <button className="btn-secondary" onClick={onOpenFilter}>
          🔍 Filtrele
        </button>

        <button className="btn-secondary">
          🗂 Havuz
        </button>
      </div>

      <div className="customer-actions-right">
        <button className="btn-primary" onClick={onOpenCreate}>
          + Müşteri Ekle
        </button>
      </div>
    </div>
  );
}
