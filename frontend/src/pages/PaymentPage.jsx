import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAppointmentPayments, getAppointments } from "../services/events";
import PaymentCustomerRow from "../components/payment/PaymentCustomerRow.jsx";
import AddPaymentModal from "../components/payment/AddPaymentModal.jsx";
import ExportActionButton from "../components/export/ExportActionButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function PaymentPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState({});
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  const navigate = useNavigate();

  /* =========================
     FETCH DATA
  ========================= */
  const fetchData = () => {
    setLoading(true);

    Promise.all([getAppointmentPayments(), getAppointments()])
      .then(([paymentsRes, appointmentsRes]) => {
        const paymentsList =
          paymentsRes.data?.results || paymentsRes.data || [];
        setPayments(Array.isArray(paymentsList) ? paymentsList : []);

        const map = {};
        const appointmentList =
          appointmentsRes.data?.results || appointmentsRes.data || [];
        (Array.isArray(appointmentList) ? appointmentList : []).forEach((a) => {
          map[a.id] = a;
        });
        setAppointments(map);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const grouped = groupByAppointment(payments);

  return (
    <div className="payment-page-wrapper">
      {/* ================= HEADER ================= */}
      <div className="page-header">
        <h1 className="h1">Ödemeler</h1>

        <div className="page-header-actions">
          <ExportActionButton
            model="payments"
            initialRecipientEmail={user?.email || ""}
            buttonClassName="btn-secondary"
            buttonLabel="Export"
          />
          <button
              className="btn-secondary"
              onClick={() => navigate("/payments/history")}
          >
            Ödeme Geçmişi
          </button>

          <button
              className="btn-primary"
              onClick={() => setOpenModal(true)}
          >
            + Appointment Payment
          </button>
        </div>
      </div>


      {/* ================= LIST ================= */}
      <div className="payment-list-container">
        {Object.values(grouped).length === 0 && (
            <div className="payment-empty">
              Henüz ödeme bulunmuyor.
            </div>
        )}

        {Object.values(grouped).map(group => (
            <PaymentCustomerRow
                key={group.appointmentId}
                appointment={appointments[group.appointmentId]}
            payments={group.payments}
            onRefresh={fetchData}
          />
        ))}
      </div>

      {/* ================= MODAL ================= */}
      <AddPaymentModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}

/* =========================
   HELPERS
========================= */
function groupByAppointment(payments) {
  return payments.reduce((acc, p) => {
    const appointmentId = p.appointment;

    if (!acc[appointmentId]) {
      acc[appointmentId] = {
        appointmentId,
        payments: [],
      };
    }

    acc[appointmentId].payments.push(p);
    return acc;
  }, {});
}
