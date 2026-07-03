import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import "./paymentStyles.css";
import AddPaymentModal from "../../payment/AddPaymentModal";

const STATUS_LABELS = {
  kismi: "Kısmi",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
};

const PaymentItem = ({ payment, appointment, onDelete, onSuccess }) => {
  const [addModalOpen, setAddModalOpen] = useState(false);

  const formatAmount = (value) =>
    new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value || 0));

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const statusLabel = STATUS_LABELS[payment.payment_status] || payment.payment_status;
  const appointmentName = appointment?.name || `Randevu #${payment.appointment}`;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm("Bu ödeme silinecek. Emin misiniz?")) {
      onDelete(payment.id);
    }
  };

  return (
    <>
      <div className="payment-row">
        <div className="payment-row-content">
          <span className="payment-row-date">{formatDate(payment.payment_date)}</span>

          <span className="payment-row-item">
            <span className="payment-row-label">Durum:</span>
            <span className={`payment-row-status payment-status-${payment.payment_status}`}>
              {statusLabel}
            </span>
          </span>

          <span className="payment-row-item">
            <span className="payment-row-label">Randevu Adı:</span>
            <span className="payment-row-name">{appointmentName}</span>
          </span>

          <span className="payment-row-item">
            <span className="payment-row-label">Ödenen:</span>
            <span className="payment-row-amount">{formatAmount(payment.paid_amount)} ₺</span>
          </span>

          <span className="payment-row-item">
            <span className="payment-row-label">Toplam:</span>
            <span className="payment-row-amount">{formatAmount(payment.total_amount)} ₺</span>
          </span>

          {payment.remaining_amount !== undefined && (
            <span className="payment-row-item">
              <span className="payment-row-label">Kalan:</span>
              <span className="payment-row-amount">{formatAmount(payment.remaining_amount)} ₺</span>
            </span>
          )}

          {payment.created_by && (
            <span className="payment-row-item">
              <span className="payment-row-label">Ekleyen:</span>
              <span className="payment-row-meta-value">{payment.created_by}</span>
            </span>
          )}
        </div>

        <button
          className="payment-add-btn"
          onClick={(e) => { e.stopPropagation(); setAddModalOpen(true); }}
          title="Bu randevu için ödeme ekle"
          type="button"
        >
          <Plus size={14} />
        </button>

        <button
          className="payment-delete-btn"
          onClick={handleDelete}
          title="Ödemeyi sil"
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {addModalOpen && (
        <AddPaymentModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => {
            setAddModalOpen(false);
            onSuccess?.();
          }}
          appointmentId={payment.appointment}
        />
      )}
    </>
  );
};

export default PaymentItem;
