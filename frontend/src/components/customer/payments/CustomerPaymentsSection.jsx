import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getAppointmentPaymentsByCustomer,
  getAppointmentById,
  deleteAppointmentPayment,
} from "../../../services/events";
import PaymentItem from "./PaymentItem";
import AddPaymentModal from "../../payment/AddPaymentModal";

const CustomerPaymentsSection = ({ customerId }) => {
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState({});
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    loadPayments();
  }, [customerId]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await getAppointmentPaymentsByCustomer(customerId);
      const items = res.data?.results || res.data || [];
      const paymentList = Array.isArray(items) ? items : [];
      setPayments(paymentList);

      const uniqueIds = [
        ...new Set(paymentList.map((p) => p.appointment).filter(Boolean)),
      ];
      const results = await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const r = await getAppointmentById(id);
            return r.data;
          } catch {
            return null;
          }
        })
      );

      const map = {};
      results.forEach((appt) => {
        if (appt?.id) map[appt.id] = appt;
      });
      setAppointments(map);
    } catch {
      toast.error("Ödemeler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentId) => {
    try {
      await deleteAppointmentPayment(paymentId);
      toast.success("Ödeme silindi.");
      loadPayments();
    } catch {
      toast.error("Ödeme silinemedi.");
    }
  };

  return (
    <div className="events-container customer-payment-card">
      <div className="events-header">
        <h3 className="events-title">Ödemeler</h3>
        <button
          className="btn-primary customer-action-icon-button"
          onClick={() => setAddModalOpen(true)}
          title="Ödeme Ekle"
          aria-label="Ödeme Ekle"
          type="button"
        >
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="events-list">
        {loading ? (
          <div className="event-skeleton">Yükleniyor...</div>
        ) : payments.length === 0 ? (
          <div className="events-empty">Bu müşteri için henüz ödeme yok.</div>
        ) : (
          payments.map((payment) => (
            <PaymentItem
              key={payment.id}
              payment={payment}
              appointment={appointments[payment.appointment]}
              onDelete={handleDelete}
              onSuccess={loadPayments}
            />
          ))
        )}
      </div>

      {addModalOpen && (
        <AddPaymentModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => {
            setAddModalOpen(false);
            loadPayments();
          }}
        />
      )}
    </div>
  );
};

export default CustomerPaymentsSection;
