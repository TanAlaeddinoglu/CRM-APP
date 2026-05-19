import { Trash } from "lucide-react";
import toast from "react-hot-toast";
import { deleteAppointmentPayment } from "../../services/events";
import "./payment.css";

export default function PaymentDetailsTable({ payments, onRefresh }) {
  const handleDelete = async (paymentId) => {
    const ok = window.confirm(
      "This payment will be deleted. Are you sure?"
    );
    if (!ok) return;

    try {
      await deleteAppointmentPayment(paymentId);
      toast.success("Payment deleted successfully");
      onRefresh?.();
    } catch {
      toast.error("Failed to delete payment");
    }
  };

  return (
    <table className="payment-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Paid</th>
          <th>Remaining</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        {payments.map((p) => (
          <tr key={p.id}>
            <td>{new Date(p.payment_date).toLocaleDateString()}</td>
            <td>{p.paid_amount} ₺</td>
            <td>{p.remaining_amount} ₺</td>
            <td>
              <PaymentStatusBadge
                status={p.payment_status}
                paidAmount={p.paid_amount}
              />
            </td>
            <td>
              <button
                className="delete-payment-btn"
                onClick={() => handleDelete(p.id)}
                title="Delete payment"
              >
                <Trash size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PaymentStatusBadge({ status, paidAmount }) {
  const normalized = String(status || "").toLowerCase();
  const isPaymentNotStarted =
    normalized === "kismi" && Number(paidAmount || 0) === 0;
  const statusClass = isPaymentNotStarted
    ? "not-started"
    : getPaymentStatusClass(normalized);
  const statusLabel = isPaymentNotStarted
    ? "Ödemeye başlanmadı"
    : getPaymentStatusLabel(normalized);

  return (
    <span className={`payment-status-badge ${statusClass}`}>
      {statusLabel}
    </span>
  );
}

function getPaymentStatusClass(status) {
  if (status === "tamamlandi") return "completed";
  if (status === "kismi") return "partial";
  if (status === "iptal") return "cancelled";
  return "default";
}

function getPaymentStatusLabel(status) {
  if (status === "tamamlandi") return "Tamamlandı";
  if (status === "kismi") return "Kısmi";
  if (status === "iptal") return "İptal";
  return status || "-";
}
