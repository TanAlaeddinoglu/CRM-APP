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
        <div
          className={`summary ${getCustomerSummaryStatusClass(
            latestPayment?.payment_status,
            paid
          )}`}
        >
          <button
            className="expand-btn"
            onClick={() => setOpen(!open)}
          >
            {open ? "▼" : "▶"}
          </button>

          <div className="customer-name">
            <div className="customer-text">
              {appointment?.customer ?? "Bilinmeyen müşteri"}

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

          <span className="amount">Toplam: {formatAmount(total)} ₺</span>
          <span className="amount">Ödenen: {formatAmount(paid)} ₺</span>
          <span className="amount">Kalan: {formatAmount(remaining)} ₺</span>

          <button
            className="add-payment-btn"
            onClick={() => setOpenModal(true)}
            title="Ödeme ekle"
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

function getCustomerSummaryStatusClass(status, paidAmount) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "tamamlandi") return "payment-summary-completed";
  if (normalized === "kismi" && Number(paidAmount || 0) === 0) {
    return "payment-summary-not-started";
  }
  if (normalized === "kismi") return "payment-summary-partial";
  if (normalized === "iptal") return "payment-summary-cancelled";

  return "";
}

function formatAmount(value) {
  return Number(value || 0).toFixed(2);
}
