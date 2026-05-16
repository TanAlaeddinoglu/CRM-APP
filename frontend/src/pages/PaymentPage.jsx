import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  getAppointmentPayments,
  getAppointmentById,
} from "../services/events";
import PaymentCustomerRow from "../components/payment/PaymentCustomerRow.jsx";
import AddPaymentModal from "../components/payment/AddPaymentModal.jsx";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PaymentPage() {
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState({});
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.max(1, Number(searchParams.get("page_size") || 10));
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      updateSearchParams(1, pageSize);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const paymentsRes = await getAppointmentPayments({
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearch || undefined,
      });

      const paymentsData = paymentsRes.data;
      const paymentsList = paymentsData?.results || paymentsData || [];
      const normalizedPayments = Array.isArray(paymentsList) ? paymentsList : [];

      setPayments(normalizedPayments);
      setTotalCount(Number(paymentsData?.count || normalizedPayments.length || 0));

      const appointmentIds = Array.from(
        new Set(
          normalizedPayments
            .map((payment) => payment?.appointment)
            .filter(Boolean)
        )
      );

      const appointmentResults = await Promise.all(
        appointmentIds.map(async (id) => {
          try {
            const res = await getAppointmentById(id);
            return res.data;
          } catch (error) {
            console.error(`Appointment detail fetch failed for id=${id}`, error);
            return null;
          }
        })
      );

      const map = {};
      appointmentResults.forEach((appointment) => {
        if (appointment?.id) {
          map[appointment.id] = appointment;
        }
      });

      setAppointments(map);
    } catch (error) {
      console.error("Payment page fetch error:", error);
      setPayments([]);
      setAppointments({});
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, debouncedSearch]);

  const grouped = useMemo(() => groupByAppointment(payments), [payments]);
  const groupedRows = Object.values(grouped);

  const updateSearchParams = (nextPage, nextPageSize = pageSize) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    next.set("page_size", String(nextPageSize));
    setSearchParams(next);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    updateSearchParams(page, pageSize);
  };

  const handlePageSizeChange = (event) => {
    const nextSize = Number(event.target.value) || 10;
    updateSearchParams(1, nextSize);
  };

  const renderPageNumbers = () => {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push("left-ellipsis");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("right-ellipsis");
    }

    pages.push(totalPages);

    return pages;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="payment-page-wrapper">
      <div className="page-header">
        <h1 className="h1">Ödemeler</h1>

        <div className="page-header-actions">
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

      <div className="payment-history-filters">
        <input
          className="payment-history-search"
          type="text"
          placeholder="Müşteri ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="payment-list-container">
        {groupedRows.length === 0 && (
          <div className="payment-empty">
            Henüz ödeme bulunmuyor.
          </div>
        )}

        {groupedRows.map((group) => (
          <PaymentCustomerRow
            key={group.appointmentId}
            appointment={appointments[group.appointmentId]}
            payments={group.payments}
            onRefresh={fetchData}
          />
        ))}
      </div>

      {totalCount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginTop: "20px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Toplam <strong style={{ color: "#0f172a" }}>{totalCount}</strong> kayıt
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={paginationButtonStyle(currentPage === 1)}
            >
              ‹
            </button>

            {renderPageNumbers().map((item, index) => {
              if (typeof item !== "number") {
                return (
                  <span
                    key={`${item}-${index}`}
                    style={{
                      minWidth: "36px",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: "14px",
                    }}
                  >
                    ...
                  </span>
                );
              }

              const isActive = item === currentPage;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handlePageChange(item)}
                  style={pageNumberStyle(isActive)}
                >
                  {item}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={paginationButtonStyle(currentPage === totalPages)}
            >
              ›
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginLeft: "8px",
              }}
            >
              <span
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                / sayfa
              </span>

              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                style={{
                  height: "38px",
                  borderRadius: "12px",
                  border: "1px solid #d6e0ea",
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#0f172a",
                  background: "#fff",
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <AddPaymentModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}

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

function paginationButtonStyle(disabled) {
  return {
    minWidth: "38px",
    height: "38px",
    borderRadius: "12px",
    border: "1px solid #d6e0ea",
    background: disabled ? "#f8fafc" : "#ffffff",
    color: disabled ? "#94a3b8" : "#0f172a",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "16px",
    fontWeight: 700,
  };
}

function pageNumberStyle(isActive) {
  return {
    minWidth: "38px",
    height: "38px",
    borderRadius: "12px",
    border: isActive ? "1px solid #0f254f" : "1px solid #d6e0ea",
    background: isActive ? "#0f254f" : "#ffffff",
    color: isActive ? "#ffffff" : "#0f172a",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
  };
}