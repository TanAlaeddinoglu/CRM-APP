import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAppointmentPayments,
  getAppointments,
} from "../../services/events";
import PaymentHistoryTable from "./PaymentHistoryTable";
import ExportActionButton from "../export/ExportActionButton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import "./payment.css";

export default function PaymentHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState({});

  const [customerFilter, setCustomerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* =========================
     LOAD DATA
  ========================= */
  useEffect(() => {
    Promise.all([getAppointmentPayments(), getAppointments()]).then(
      ([pRes, aRes]) => {
        const paymentsList = pRes.data?.results || pRes.data || [];
        setPayments(Array.isArray(paymentsList) ? paymentsList : []);

        const map = {};
        const appointmentList = aRes.data?.results || aRes.data || [];
        (Array.isArray(appointmentList) ? appointmentList : []).forEach(
          (a) => {
            map[a.id] = a;
          }
        );
        setAppointments(map);
      }
    );
  }, []);

  /* =========================
     FILTERED + SORTED ROWS
  ========================= */
  const rows = useMemo(() => {
    return payments
      .map(p => ({
        ...p,
        appointment: appointments[p.appointment],
      }))
      .filter(p => {
        // CUSTOMER FILTER
        if (customerFilter) {
          const customer =
            p.appointment?.customer?.toLowerCase() || "";
          if (!customer.includes(customerFilter.toLowerCase())) {
            return false;
          }
        }

        const paymentDate = new Date(p.payment_date);

        // DATE FROM
        if (dateFrom) {
          const from = new Date(dateFrom);
          if (paymentDate < from) return false;
        }

        // DATE TO
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (paymentDate > to) return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.payment_date) -
          new Date(a.payment_date)
      );
  }, [payments, appointments, customerFilter, dateFrom, dateTo]);

  return (
    <div className="payment-page-wrapper">
      {/* ================= HEADER ================= */}
      <div className="page-header">
        <h1 className="h1">Ödeme Geçmişi</h1>

        <div className="page-header-actions">
          <ExportActionButton
            model="payments"
            initialRecipientEmail={user?.email || ""}
            buttonClassName="btn-secondary"
            buttonLabel="Export"
          />
          <button
            className="btn-secondary"
            onClick={() => navigate("/payments")}
          >
            ← Ödemelere Dön
          </button>
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <input
          type="text"
          placeholder="Müşteri adına göre filtrele"
          value={customerFilter}
          onChange={e => setCustomerFilter(e.target.value)}
        />

        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
        />

        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
        />
      </div>

      {/* ================= TABLE ================= */}
      <PaymentHistoryTable rows={rows} />
    </div>
  );
}
