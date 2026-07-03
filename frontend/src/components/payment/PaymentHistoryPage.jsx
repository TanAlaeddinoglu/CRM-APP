import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAppointmentPayments,
  getAppointmentById,
} from "../../services/events";
import PaymentHistoryTable from "./PaymentHistoryTable";
import ExportActionButton from "../export/ExportActionButton.jsx";
import LoadingIndicator from "../common/LoadingIndicator.jsx";
import FilterBar from "../common/FilterBar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePageTransition } from "../../context/PageTransitionContext.jsx";
import { Upload } from "lucide-react";
import "./payment.css";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PaymentHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState({});
  const [loading, setLoading] = useState(true);
  usePageTransition(loading);
  const [totalCount, setTotalCount] = useState(0);

  const [customerFilter, setCustomerFilter] = useState("");
  const [debouncedCustomerFilter, setDebouncedCustomerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerFilter(customerFilter.trim());
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [customerFilter]);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      try {
        const paymentRes = await getAppointmentPayments({
          page: currentPage,
          page_size: pageSize,
          search: debouncedCustomerFilter || undefined,
        });

        if (cancelled) return;

        const paymentsList = paymentRes.data?.results || [];
        setPayments(Array.isArray(paymentsList) ? paymentsList : []);
        setTotalCount(Number(paymentRes.data?.count || 0));

        const uniqueAppointmentIds = Array.from(
          new Set(
            (Array.isArray(paymentsList) ? paymentsList : [])
              .map((p) => p.appointment)
              .filter(Boolean)
          )
        );

        const appointmentResults = await Promise.all(
          uniqueAppointmentIds.map(async (id) => {
            try {
              const res = await getAppointmentById(id);
              return res.data;
            } catch {
              return null;
            }
          })
        );

        if (cancelled) return;

        const map = {};
        appointmentResults.forEach((a) => {
          if (a?.id) {
            map[a.id] = a;
          }
        });

        setAppointments(map);
      } catch (error) {
        if (!cancelled) {
          setPayments([]);
          setAppointments({});
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [currentPage, pageSize, debouncedCustomerFilter]);

  const rows = useMemo(() => {
    return payments
      .map((p) => ({
        ...p,
        appointment: appointments[p.appointment],
      }))
      .filter((p) => {
        const paymentDate = new Date(p.payment_date);

        if (dateFrom) {
          const from = new Date(dateFrom);
          if (paymentDate < from) return false;
        }

        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (paymentDate > to) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  }, [payments, appointments, dateFrom, dateTo]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e) => {
    const nextSize = Number(e.target.value) || 10;
    setPageSize(nextSize);
    setCurrentPage(1);
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

  return (
    <div className="payment-page-wrapper">
      <div className="page-header">
        <h1 className="h1">Ödeme Geçmişi</h1>

        <div className="page-header-actions">
          <ExportActionButton
            model="payments"
            initialRecipientEmail={user?.email || ""}
            buttonClassName="btn-secondary customer-action-icon-button"
            buttonLabel={<Upload size={18} strokeWidth={2} />}
            buttonTitle="Dışa Aktar"
            ariaLabel="Dışa Aktar"
          />
          <button
            className="btn-secondary"
            onClick={() => navigate("/payments")}
          >
            ← Ödemelere Dön
          </button>
        </div>
      </div>

      <FilterBar>
        <FilterBar.Search
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          placeholder="Müşteri adına göre filtrele"
        />
        <FilterBar.DateRange
          value={datePreset}
          onChange={(key, from, to) => {
            setDatePreset(key);
            setDateFrom(from);
            setDateTo(to);
          }}
        />
      </FilterBar>
      {loading ? (
        <LoadingIndicator inline label="Ödeme geçmişi yükleniyor" />
      ) : (
        <>
          <PaymentHistoryTable rows={rows} />

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
        </>
      )}
    </div>
  );
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
