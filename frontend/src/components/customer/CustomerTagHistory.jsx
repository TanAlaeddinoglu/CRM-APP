import React, { useEffect, useState } from "react";
import { getCustomerTagHistory } from "../../services/customer.js";
import { usePageTransition } from "../../context/PageTransitionContext.jsx";
import "../../assets/css/CustomerTagHistory.css";

const CustomerTagHistory = ({ customerId, refreshKey }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageTransition(loading);

  useEffect(() => {
    if (!customerId) return;

    const fetchHistory = async () => {
      setLoading(true);

      try {
        const res = await getCustomerTagHistory(customerId);
        const sorted = res.data.sort(
          (a, b) => new Date(b.changed_at) - new Date(a.changed_at)
        );
        setHistory(sorted);
      } catch (error) {
        console.error("Error fetching tag history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [customerId, refreshKey]); // 🔥 refreshKey değişince otomatik yeniden fetch

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="tag-history-container">
      <h3 className="tag-history-title">Tag Geçmişi</h3>

      <div className="tag-history-list">
        {loading ? (
          <>
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="tag-history-item skeleton">
                <div className="tag-history-dot skeleton-dot" />
                <div className="tag-history-content">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line long" />
                </div>
              </div>
            ))}
          </>
        ) : (
          history.map((item) => (
            <div key={item.id} className="tag-history-item">
              <div className="tag-history-dot" />

              <div className="tag-history-content">
                <div className="tag-history-header">
                  <span className="tag-date">{formatDate(item.changed_at)}</span>
                  <span className="tag-user">• {item.changed_by}</span>
                </div>

                <div className="tag-change-line">
                  <span className="tag-from">{item.from_tag || "-"}</span>
                  <span className="tag-arrow">→</span>
                  <span className="tag-to">{item.to_tag || "-"}</span>
                </div>

                {item.notes && (
                  <div className="tag-notes">Not: {item.notes}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CustomerTagHistory;
