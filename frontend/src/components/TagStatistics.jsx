// src/components/TagStatistics.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getCustomerTagStats, getMyCustomerTagStats } from "../services/customer";
import { useAuth } from "../context/AuthContext";
import "../assets/css/TagStatistics.css";

export default function TagStatistics() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [stats, setStats] = useState({ total: 0, by_tag: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      setLoading(true);

      const res = isAdmin ? await getCustomerTagStats() : await getMyCustomerTagStats();

      setStats(res.data || { total: 0, by_tag: [] });
    } catch (err) {
      console.error("Tag stats load error:", err);
      setStats({ total: 0, by_tag: [] });
    } finally {
      setLoading(false);
    }
  };

  /* ================= TAG COUNT ================= */
  const tagStats = useMemo(() => {
    const obj = {};

    (stats.by_tag || []).forEach((row) => {
      // backend: values("tag__tag_name") -> null ise Etiketsiz
      const tagName = row?.tag__tag_name ?? "Etiketsiz";
      obj[tagName] = row?.count ?? 0;
    });

    return obj;
  }, [stats]);

  const total = stats.total ?? 0;

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
