import { useState, useMemo } from "react";
import { Plus, Check } from "lucide-react";
import PaymentDetailsTable from "./PaymentDetailsTable";
import AddPaymentModal from "./AddPaymentModal";
import "./payment.css";

export default function PaymentCustomerRow({
  appointment,
  payments,
  onRefresh,
}) {
  const [open, setOpen] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  // EN GÜNCEL PAYMENT
  const latestPayment = useMemo(() => {
    if (!payments || payments.length === 0) return null;

    return [...payments].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )[0];
  }, [payments]);

  const total = latestPayment?.total_amount ?? 0;

  const paid = payments.reduce(
    (sum, p) => sum + Number(p.paid_amount || 0),
    0
  );

  const remaining = latestPayment?.remaining_amount ?? 0;
  const isCompleted = latestPayment?.payment_status === "tamamlandi";

  return (
    <>
      <div className={`customer-row ${open ? "open" : ""}`}>
        <div className="summary">
          {/* EXPAND */}
          <button
            className="expand-btn"
            onClick={() => setOpen(!open)}
          >
            {open ? "▼" : "▶"}
          </button>

          {/* CUSTOMER + APPOINTMENT */}
          <div className="customer-name">
            <div className="customer-text">
              {appointment?.customer ?? "Unknown customer"}

              {isCompleted && (
                <Check
                  size={16}
                  className="payment-complete-icon"
                />
              )}
            </div>

            <div className="appointment-text">
              {appointment?.name ?? ""}
            </div>
          </div>

          {/* AMOUNTS */}
          <span className="amount">Total: {total} ₺</span>
          <span className="amount">Paid: {paid} ₺</span>
          <span className="amount">Remaining: {remaining} ₺</span>

          {/* ADD PAYMENT */}
          <button
            className="add-payment-btn"
            onClick={() => setOpenModal(true)}
            title="Add payment"
            disabled={remaining === 0}
          >
            <Plus size={16} />
          </button>
        </div>

        {open && (
          <PaymentDetailsTable
            payments={payments}
            onRefresh={onRefresh}
          />
        )}
      </div>

      {/* MODAL */}
      <AddPaymentModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        appointmentId={appointment?.id}
        onSuccess={() => {
          setOpenModal(false);
          onRefresh?.();
        }}
      />
    </>
  );
}
