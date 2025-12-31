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
            <td>
              {new Date(p.payment_date).toLocaleDateString()}
            </td>
            <td>{p.paid_amount} ₺</td>
            <td>{p.remaining_amount} ₺</td>
            <td>{p.payment_status}</td>
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
