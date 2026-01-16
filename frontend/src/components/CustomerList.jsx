// src/components/CustomerList.jsx
import React, {useEffect, useMemo, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import "../assets/css/CustomerList.css";

export default function CustomerList({
    customers = [],
    totalCount = 0,
    selectedIds,
    onSelectionChange,
}) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [localSelected, setLocalSelected] = useState([]);
    const [sortKey, setSortKey] = useState(null);
    const [asc, setAsc] = useState(true);

    const selected = selectedIds ?? localSelected;
    const setSelected = onSelectionChange ?? setLocalSelected;

    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("page_size") || 10);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    /* ================= SELECTION ================= */
    useEffect(() => {
        setSelected([]);
    }, [customers, setSelected]);

    function toggleAll(e) {
        e.stopPropagation();
        setSelected(e.target.checked ? customers.map((c) => c.id) : []);
    }

    function toggleOne(e, id) {
        e.stopPropagation();
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    }

    const allChecked =
        customers.length > 0 && selected.length === customers.length;

    /* ================= SORT ================= */
    function sortBy(key) {
        if (sortKey === key) setAsc((p) => !p);
        else {
            setSortKey(key);
            setAsc(true);
        }
    }

    const sorted = useMemo(() => {
        const arr = [...customers];
        if (!sortKey || sortKey === "products") return arr;

        return arr.sort((a, b) => {
            const av = a?.[sortKey];
            const bv = b?.[sortKey];

            if (sortKey === "updated_at") {
                return asc
                    ? new Date(av || 0) - new Date(bv || 0)
                    : new Date(bv || 0) - new Date(av || 0);
            }

            if (sortKey === "tag_timer_days") {
                return asc
                    ? (av ?? Infinity) - (bv ?? Infinity)
                    : (bv ?? -Infinity) - (av ?? -Infinity);
            }

            return asc
                ? String(av ?? "").localeCompare(String(bv ?? ""))
                : String(bv ?? "").localeCompare(String(av ?? ""));
        });
    }, [customers, sortKey, asc]);

    /* ================= PAGINATION ================= */
    function changePage(p) {
        const params = new URLSearchParams(searchParams);
        params.set("page", p);
        setSearchParams(params);
    }

    function changePageSize(size) {
        const params = new URLSearchParams(searchParams);
        params.set("page_size", size);
        params.set("page", 1);
        setSearchParams(params);
    }

    function getPageNumbers(current, total) {
        const pages = [];

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
            return pages;
        }

        pages.push(1);

        if (current > 4) pages.push("...");

        const start = Math.max(2, current - 2);
        const end = Math.min(total - 1, current + 2);

        for (let i = start; i <= end; i++) pages.push(i);

        if (current < total - 3) pages.push("...");

        pages.push(total);
        return pages;
    }

    return (
        <div className="customer-list-container">
            <div className="customer-table-wrapper">
                <table className="customer-table">
                    <thead>
                    <tr>
                        <th className="checkbox-col">
                            <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={toggleAll}
                            />
                        </th>

                        {[
                            ["customer_name", "Ad"],
                            ["customer_surname", "Soyad"],
                            ["customer_email", "Email"],
                            ["customer_phone", "Telefon"],
                            ["city", "Şehir"],
                            ["tag", "Tag"],
                            ["tag_timer_days", "Tag Süresi"],
                            ["status", "Status"],
                            ["assigned_to", "Assigned"],
                            ["products", "Products"],
                            ["updated_at", "Updated"],
                            ["source", "Source"],
                        ].map(([key, label]) => (
                            <th key={key} onClick={() => sortBy(key)}>
                                {label}
                                {sortKey === key && (asc ? " ▲" : " ▼")}
                            </th>
                        ))}
                    </tr>
                    </thead>

                    <tbody>
                    {sorted.map((c) => (
                        <tr
                            key={c.id}
                            className="customer-row"
                            onClick={() => navigate(`/customers/${c.id}`)}
                        >
                            <td className="checkbox-col">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(c.id)}
                                    onClick={(e) => e.stopPropagation()}   // 🔥 KRİTİK
                                    onChange={(e) => toggleOne(e, c.id)}
                                />
                            </td>

                            <td>{c.customer_name}</td>
                            <td>{c.customer_surname}</td>
                            <td>{c.customer_email || "-"}</td>
                            <td>{c.customer_phone || "-"}</td>
                            <td>{c.city || "-"}</td>

                            {/* TAG */}
                            <td>
                                <span
                                    className={`tag-badge ${c.status === "archived" ? "tag-archived" : (c.tag ? "" : "tag-pool")}`}
                                >
                                    {c.status === "archived" ? "Archive" : (c.tag || "Pool")}
                                </span>
                            </td>

                            {/* TAG SÜRESİ */}
                            <td className="tag-timer-col">
                                {c.tag_timer_days !== null &&
                                    c.tag_timer_days !== undefined && (
                                        <span className={`tag-timer-pill ${c.tag_timer_days >= 7 ? "danger" : ""}`}>{c.tag_timer_days} gün</span>
                                    )}
                            </td>


                            <td>
                  <span className={`status-badge ${c.status}`}>
                    {c.status}
                  </span>
                            </td>

                            <td>{c.assigned_to || "-"}</td>

                            <td className="product-col">
                                <div className="product-list">
                                    {c.products?.map((p) => (
                                        <span key={p.id} className="badge product-badge">
                        {p.product}
                      </span>
                                    ))}
                                </div>
                            </td>

                            <td>{new Date(c.updated_at).toLocaleString()}</td>
                            <td>{c.source}</td>
                        </tr>
                    ))}

                    {sorted.length === 0 && (
                        <tr>
                            <td colSpan={13} className="customer-empty">
                                Kayıt bulunamadı
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="customer-pagination">
                <div className="page-controls">
                    <button
                        disabled={page === 1}
                        onClick={() => changePage(page - 1)}
                    >
                        ◀
                    </button>

                    {getPageNumbers(page, totalPages).map((p, idx) =>
                        p === "..." ? (
                            <span key={`dots-${idx}`} className="page-dots">…</span>
                        ) : (
                            <button
                                key={p}
                                className={`page-number ${p === page ? "active" : ""}`}
                                onClick={() => changePage(p)}
                            >
                                {p}
                            </button>
                        )
                    )}

                    <button
                        disabled={page === totalPages}
                        onClick={() => changePage(page + 1)}
                    >
                        ▶
                    </button>
                </div>

                <select
                    value={pageSize}
                    onChange={(e) => changePageSize(e.target.value)}
                >
                    {[10, 25, 50, 100].map((s) => (
                        <option key={s} value={s}>
                            {s} / sayfa
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
