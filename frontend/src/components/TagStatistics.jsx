// src/components/TagStatistics.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getCustomers, getMyCustomers } from "../services/customer";
import { useAuth } from "../context/AuthContext";
import "../assets/css/TagStatistics.css";

export default function TagStatistics() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);

      const res = isAdmin
        ? await getCustomers({ page_size: 1000 })
        : await getMyCustomers({ page_size: 1000 });

      // 🔴 EN KRİTİK SATIR
      setCustomers(res.data?.results || []);
    } catch (err) {
      console.error("Tag stats load error:", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= TAG COUNT ================= */
  const tagStats = useMemo(() => {
    const stats = {};

    customers.forEach((c) => {
      const tag = c.tag || "Etiketsiz";
      stats[tag] = (stats[tag] || 0) + 1;
    });

    return stats;
  }, [customers]);

  const total = customers.length;

  return (
    <div className="tag-stats-container">
      <h3 className="tag-stats-title">Etiket İstatistikleri</h3>

      {loading ? (
        <div className="tag-stats-loading">Yükleniyor...</div>
      ) : (
        <div className="tag-stats-list">
          {/* TOTAL */}
          <div className="tag-stats-item total">
            Toplam müşteri <span>{total}</span>
          </div>

          {/* TAGS */}
          {Object.entries(tagStats).map(([tag, count]) => (
            <div key={tag} className="tag-stats-item">
              {tag} <span>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
