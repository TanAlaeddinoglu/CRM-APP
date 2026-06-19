import React, { useEffect, useState } from "react";
import "./paymentStyles.css";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getAppointmentPaymentsByCustomer,
  getAppointmentById,
  deleteAppointmentPayment,
} from "../../../services/events";
import PaymentCustomerRow from "../../payment/PaymentCustomerRow";
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

  const grouped = payments.reduce((acc, p) => {
    const key = p.appointment;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

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

      <div className="events-list customer-payments-list">
        {loading ? (
          <div className="event-skeleton">Yükleniyor...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="events-empty">Bu müşteri için henüz ödeme yok.</div>
        ) : (
          Object.entries(grouped).map(([apptId, apptPayments]) => (
            <PaymentCustomerRow
              key={apptId}
              appointment={appointments[Number(apptId)]}
              payments={apptPayments}
              onRefresh={loadPayments}
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
          customerId={customerId}
        />
      )}
    </div>
  );
};

export default CustomerPaymentsSection;
