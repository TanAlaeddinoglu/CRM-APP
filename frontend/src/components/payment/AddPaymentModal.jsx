import {useEffect, useRef, useState} from "react";
import toast from "react-hot-toast";
import {
  createAppointmentPayment,
  getAppointments,
  getAppointmentPayments,
} from "../../services/events";
import "./payment.css";

export default function AddPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  appointmentId,
}) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    appointment: appointmentId ?? "",
    total_amount: "",
    paid_amount: "",
    payment_date: "",
  });

  const [isExistingPayment, setIsExistingPayment] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    getAppointments().then(res => {
      setAppointments(res.data);
    });
  }, [isOpen]);

  useEffect(() => {
    if (appointmentId) {
      setForm(f => ({ ...f, appointment: appointmentId }));
    }
  }, [appointmentId]);

  const checkedAppointmentRef = useRef(null);


  useEffect(() => {
  if (!form.appointment) return;

  // ⛔ Aynı appointment için tekrar çalışma
  if (checkedAppointmentRef.current === form.appointment) return;
  checkedAppointmentRef.current = form.appointment;

  let cancelled = false;

  getAppointmentPayments()
    .then(res => {
      if (cancelled) return;

      const related = res.data.filter(
        p => p.appointment === Number(form.appointment)
      );

      if (related.length > 0) {
        const latest = related.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )[0];

        setForm(f => ({
          ...f,
          total_amount: latest.total_amount,
        }));

        setIsExistingPayment(true);

        toast.info(
          "Existing payment found. Total amount auto-filled.",
          { id: "existing-payment-info" } // ⛔ toast spam engel
        );
      } else {
        setIsExistingPayment(false);
        setForm(f => ({ ...f, total_amount: "" }));
      }
    })
    .catch(() => {
      // 🔇 silent fail (optional UX)
    });

  return () => {
    cancelled = true;
  };
}, [form.appointment]);


  if (!isOpen) return null;

  /* =========================
     HANDLERS
  ========================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.appointment || !form.paid_amount || !form.payment_date) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      await createAppointmentPayment({
        appointment: form.appointment,
        total_amount: form.total_amount || undefined,
        paid_amount: form.paid_amount,
        payment_date: form.payment_date,
      });

      toast.success("Payment created successfully");

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error("Payment creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        {/* HEADER */}
        <div className="modal-header">
          <h2>Add Appointment Payment</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          <label>Appointment *</label>
          <select
            name="appointment"
            value={form.appointment}
            onChange={handleChange}
            disabled={Boolean(appointmentId)}
          >
            <option value="">Select appointment</option>
            {appointments.map(a => (
              <option key={a.id} value={a.id}>
                {a.customer} — {a.name}
              </option>
            ))}
          </select>

          <label>Total Amount</label>
          <input
            type="number"
            name="total_amount"
            value={form.total_amount}
            onChange={handleChange}
            disabled={isExistingPayment}
          />

          {isExistingPayment && (
            <small className="info-text">
              Total amount is locked for existing payments
            </small>
          )}

          <label>Paid Amount *</label>
          <input
            type="number"
            name="paid_amount"
            value={form.paid_amount}
            onChange={handleChange}
          />

          <label>Payment Date *</label>
          <input
            type="datetime-local"
            name="payment_date"
            value={form.payment_date}
            onChange={handleChange}
          />
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Create Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
