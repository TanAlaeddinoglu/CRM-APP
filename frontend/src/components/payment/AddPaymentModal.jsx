import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  createAppointmentPayment,
  getAppointments,
  getAppointmentPayments,
  getAppointmentById,
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [selectedAppointmentLabel, setSelectedAppointmentLabel] = useState("");
  const [selectedAppointmentProduct, setSelectedAppointmentProduct] = useState("");

  const [form, setForm] = useState({
    appointment: appointmentId ?? "",
    total_amount: "",
    paid_amount: "",
    payment_date: "",
  });

  const [isExistingPayment, setIsExistingPayment] = useState(false);
  const checkedAppointmentRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (appointmentId) {
      setForm((prev) => ({
        ...prev,
        appointment: appointmentId,
      }));
      return;
    }

    setAppointments([]);
    setAppointmentSearch("");
    setSelectedAppointmentLabel("");
    setSelectedAppointmentProduct("");
    setForm({
      appointment: "",
      total_amount: "",
      paid_amount: "",
      payment_date: "",
    });
    setIsExistingPayment(false);
    checkedAppointmentRef.current = null;
  }, [isOpen, appointmentId]);

  useEffect(() => {
    if (!isOpen || !appointmentId) return;

    let cancelled = false;

    async function loadAppointmentLabel() {
      try {
        const res = await getAppointmentById(appointmentId);
        if (cancelled) return;

        const appointment = res.data;
        const label = `${appointment?.customer ?? "Unknown customer"} — ${appointment?.name ?? ""}`;

        setSelectedAppointmentLabel(label);
        setSelectedAppointmentProduct(appointment?.product || "");
      } catch {
        if (!cancelled) {
          setSelectedAppointmentLabel(`Appointment #${appointmentId}`);
          setSelectedAppointmentProduct("");
        }
      }
    }

    loadAppointmentLabel();

    return () => {
      cancelled = true;
    };
  }, [isOpen, appointmentId]);

  useEffect(() => {
    if (!isOpen || appointmentId) return;

    const query = appointmentSearch.trim();

    if (query.length < 2) {
      setAppointments([]);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);

        const res = await getAppointments({
          search: query,
          page: 1,
          page_size: 20,
        });

        if (cancelled) return;

        const list = res.data?.results || res.data || [];
        setAppointments(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) {
          setAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [appointmentSearch, isOpen, appointmentId]);

  useEffect(() => {
    if (!isOpen || !form.appointment) return;

    if (checkedAppointmentRef.current === form.appointment) return;
    checkedAppointmentRef.current = form.appointment;

    let cancelled = false;

    getAppointmentPayments({ page_size: 1000 })
      .then((res) => {
        if (cancelled) return;

        const list = res.data?.results || res.data || [];
        const related = (Array.isArray(list) ? list : []).filter(
          (p) => p.appointment === Number(form.appointment)
        );

        if (related.length > 0) {
          const latest = related.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )[0];

          setForm((prev) => ({
            ...prev,
            total_amount: latest.total_amount,
          }));

          setIsExistingPayment(true);

          toast.info("Existing payment found. Total amount auto-filled.", {
            id: "existing-payment-info",
          });
        } else {
          setIsExistingPayment(false);
          setForm((prev) => ({
            ...prev,
            total_amount: "",
          }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isOpen, form.appointment]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAppointmentSelect = (appointment) => {
    setForm((prev) => ({
      ...prev,
      appointment: appointment.id,
    }));

    const label = `${appointment.customer ?? "Unknown customer"} — ${appointment.name ?? ""}`;
    setAppointmentSearch(label);
    setSelectedAppointmentLabel(label);
    setSelectedAppointmentProduct(appointment.product || "");
    setAppointments([]);
  };

  const formatPaymentDateForApi = (dateStr) => {
    if (!dateStr) return "";
    return `${dateStr}T12:00:00`;
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
        payment_date: formatPaymentDateForApi(form.payment_date),
      });

      toast.success("Payment created successfully");
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Payment creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Add Appointment Payment</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label>Appointment *</label>

          {appointmentId ? (
            <input
              type="text"
              value={selectedAppointmentLabel || `Appointment #${form.appointment}`}
              disabled
            />
          ) : (
            <div className="appointment-search-block">
              <input
                type="text"
                placeholder="Müşteri adı veya randevu adı ile ara"
                value={appointmentSearch}
                onChange={(e) => {
                  setAppointmentSearch(e.target.value);
                  setForm((prev) => ({ ...prev, appointment: "" }));
                  setIsExistingPayment(false);
                  setSelectedAppointmentProduct("");
                  checkedAppointmentRef.current = null;
                }}
              />

              {searchLoading && (
                <small className="info-text">Randevular aranıyor...</small>
              )}

              {!searchLoading &&
                appointmentSearch.trim().length > 0 &&
                appointmentSearch.trim().length < 2 && (
                  <small className="info-text">
                    Arama için en az 2 karakter gir.
                  </small>
                )}

              {!searchLoading &&
                !form.appointment &&
                appointmentSearch.trim().length >= 2 &&
                appointments.length === 0 && (
                  <small className="info-text">Sonuç bulunamadı.</small>
                )}

              {appointments.length > 0 && !form.appointment && (
                <div className="appointment-search-results">
                  {appointments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="appointment-search-item"
                      onClick={() => handleAppointmentSelect(a)}
                    >
                      <div className="appointment-search-title">
                        {a.customer ?? "Unknown customer"}
                      </div>
                      <div className="appointment-search-subtitle">
                        {a.name ?? ""}
                        {a.scheduled_for
                          ? ` — ${new Date(a.scheduled_for).toLocaleDateString()}`
                          : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {form.appointment && selectedAppointmentProduct && (
            <>
              <label>Ürün / İşlem</label>
              <input
                type="text"
                value={selectedAppointmentProduct}
                disabled
              />
            </>
          )}

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
            type="date"
            name="payment_date"
            value={form.payment_date}
            onChange={handleChange}
          />
        </div>

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