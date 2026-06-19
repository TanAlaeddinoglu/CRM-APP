import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
  customerId,
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

  const formatAmount = (val) => {
    const num = parseFloat(String(val));
    if (isNaN(num)) return "";
    return Math.round(num).toLocaleString("tr-TR");
  };

  const parseAmount = (formatted) => formatted.replace(/\./g, "").replace(/,/g, "");

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
  }, [isOpen, appointmentId, customerId]);

  useEffect(() => {
    if (!isOpen || !appointmentId) return;

    let cancelled = false;

    async function loadAppointmentLabel() {
      try {
        const res = await getAppointmentById(appointmentId);
        if (cancelled) return;

        const appointment = res.data;
        const label = appointment?.customer ?? "Bilinmeyen müşteri";

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
    if (!isOpen || appointmentId || customerId) return;

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
  }, [appointmentSearch, isOpen, appointmentId, customerId]);

  useEffect(() => {
    if (!isOpen || appointmentId || !customerId) return;

    let cancelled = false;

    async function loadCustomerAppointments() {
      try {
        setSearchLoading(true);
        const res = await getAppointments({ customerId, page_size: 50 });
        if (cancelled) return;
        const list = res.data?.results || res.data || [];
        setAppointments(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setAppointments([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }

    loadCustomerAppointments();

    return () => { cancelled = true; };
  }, [isOpen, appointmentId, customerId]);

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
            total_amount: latest.total_amount
              ? formatAmount(latest.total_amount)
              : "",
          }));

          setIsExistingPayment(true);

          toast("Mevcut ödeme bulundu. Toplam tutar otomatik dolduruldu.", {
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
    if (name === "total_amount" || name === "paid_amount") {
      const raw = value.replace(/\./g, "").replace(/,/g, "");
      const digits = raw.replace(/\D/g, "");
      setForm((prev) => ({ ...prev, [name]: digits ? Number(digits).toLocaleString("tr-TR") : "" }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAppointmentSelect = (appointment) => {
    if (appointment.status !== "satis") {
      toast.error("Bu randevuya ödeme başlatılamaz. Randevu durumu 'Satış' olmalıdır.", {
        id: "non-satis-warning",
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      appointment: appointment.id,
    }));

    const label = customerId
      ? (appointment.name ?? `Randevu #${appointment.id}`)
      : (appointment.customer ?? "Bilinmeyen müşteri");
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
      toast.error("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    setLoading(true);

    try {
      await createAppointmentPayment({
        appointment: form.appointment,
        total_amount: form.total_amount ? parseAmount(form.total_amount) : undefined,
        paid_amount: parseAmount(form.paid_amount),
        payment_date: formatPaymentDateForApi(form.payment_date),
      });

      toast.success("Ödeme başarıyla oluşturuldu.");
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Ödeme oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Ödeme Başlat</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label>Müşteri Bilgisi *</label>

          {appointmentId ? (
            <input
              type="text"
              value={selectedAppointmentLabel || ` #${form.appointment}`}
              disabled
            />
          ) : customerId ? (
            <div className="appointment-search-block">
              {searchLoading && (
                <small className="info-text">Randevular yükleniyor...</small>
              )}

              {!searchLoading && appointments.length === 0 && !form.appointment && (
                <small className="info-text">Bu müşteriye ait randevu bulunamadı.</small>
              )}

              {form.appointment ? (
                <input
                  type="text"
                  value={selectedAppointmentLabel}
                  disabled
                />
              ) : (
                appointments.length > 0 && (
                  <div className="appointment-search-results">
                    {appointments.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="appointment-search-item"
                        onClick={() => handleAppointmentSelect(a)}
                      >
                        <div className="appointment-search-title">
                          <strong>{a.name ?? `Randevu #${a.id}`}</strong>
                          {a.status !== "satis" && (
                            <AlertTriangle
                              size={14}
                              className="appointment-search-warning"
                              title="Bu randevuya ödeme başlatılamaz"
                            />
                          )}
                        </div>
                        <div className="appointment-search-subtitle">
                          {[
                            a.product,
                            a.scheduled_for
                              ? new Date(a.scheduled_for).toLocaleDateString("tr-TR")
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
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
                        <strong>{a.customer ?? "Bilinmeyen müşteri"}</strong>
                        {a.status !== "satis" && (
                          <AlertTriangle
                            size={14}
                            className="appointment-search-warning"
                            title="Bu randevuya ödeme başlatılamaz"
                          />
                        )}
                      </div>
                      <div className="appointment-search-subtitle">
                        {[
                          a.customer_phone,
                          a.product,
                          a.scheduled_for
                            ? new Date(a.scheduled_for).toLocaleDateString("tr-TR")
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
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

          <label>Toplam Tutar</label>
          <input
            type="text"
            inputMode="numeric"
            name="total_amount"
            value={form.total_amount}
            onChange={handleChange}
            disabled={isExistingPayment}
          />

          {isExistingPayment && (
            <small className="info-text">
              Mevcut ödemelerde toplam tutar kilitlidir
            </small>
          )}

          <label>Ödenen Tutar *</label>
          <input
            type="text"
            inputMode="numeric"
            name="paid_amount"
            value={form.paid_amount}
            onChange={handleChange}
          />

          <label>Ödeme Tarihi *</label>
          <input
            type="date"
            name="payment_date"
            value={form.payment_date}
            onChange={handleChange}
          />
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            İptal
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Kaydediliyor..." : "Ödeme Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}
