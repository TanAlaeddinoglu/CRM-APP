import React, {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import "../assets/css/CustomerList.css";

export default function CustomerList({customers, customerProducts}) {
    const navigate = useNavigate();

    // customers undefined veya null gelirse otomatik array yap
    const safeCustomers = Array.isArray(customers) ? customers : [];

    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: "asc",
    });

    const requestSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction:
                prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    const sortedList = useMemo(() => {
        let list = [...safeCustomers];

        if (!sortConfig.key) return list;

        list.sort((a, b) => {
            const aVal = a[sortConfig.key] || "";
            const bVal = b[sortConfig.key] || "";

            if (sortConfig.direction === "asc") return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
        });

        return list;
    }, [safeCustomers, sortConfig]);


    const maskPhone = (phone) => {
        if (!phone) return "-";
        if (phone.length < 7) return phone;
        return (
            phone.slice(0, phone.length - 7) + "***" + phone.slice(phone.length - 2)
        );
    };

    return (
        <div className="customer-table-wrapper">
            <table className="customer-table">
                <thead>
                <tr>
                    <th onClick={() => requestSort("customer_name")}>Ad Soyad</th>
                    <th onClick={() => requestSort("customer_email")}>E-posta</th>
                    <th onClick={() => requestSort("customer_phone")}>Telefon</th>
                    <th onClick={() => requestSort("city")}>Şehir</th>
                    <th>Hastalıklar</th>
                    <th onClick={() => requestSort("tag")}>Etiket</th>
                    <th onClick={() => requestSort("assigned_to")}>Atanan Kullanıcı</th>
                    <th onClick={() => requestSort("status")}>Durum</th>
                    <th onClick={() => requestSort("source")}>Kaynak</th>
                </tr>
                </thead>

                <tbody>
                {sortedList.map((c) => {
                    const diseases = customerProducts[c.id] || [];

                    return (
                        <tr
                            key={c.id}
                            className="customer-row"
                            onClick={() => navigate(`/customers/${c.id}`)}
                        >
                            <td>{c.customer_name} {c.customer_surname}</td>
                            <td>{c.customer_email}</td>
                            <td>{maskPhone(c.customer_phone)}</td>
                            <td>{c.city || "-"}</td>

                            <td>
                                {diseases.length === 0 ? (
                                    "-"
                                ) : (
                                    <div className="disease-list">
                                        {diseases.map((d) => (
                                            <span key={d.id} className="badge disease-badge">
          {d.product}
        </span>
                                        ))}
                                    </div>
                                )}
                            </td>


                            <td>
                                {c.tag ? (
                                    <span className="badge tag-badge">{c.tag}</span>
                                ) : (
                                    "-"
                                )}
                            </td>

                            <td>{c.assigned_to || "-"}</td>

                            <td>
                  <span className={`status-badge ${c.status}`}>
                    {c.status}
                  </span>
                            </td>

                            <td>{c.source}</td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}
