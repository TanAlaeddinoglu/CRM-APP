// src/pages/CustomerPage.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "react-router-dom";

import CustomerList from "../components/CustomerList";
import TagStatistics from "../components/TagStatistics";
import CustomerPageActions from "../components/customer/CustomerPageActions";
import CustomerFilterModal from "../components/customer/CustomerFilterModal";
import CustomerCreateModal from "../components/customer/CustomerCreateModal";

import { getCustomers, getMyCustomers } from "../services/customer";
import { getCustomerProducts } from "../services/customerProducts";
import { getUsers } from "../services/user";
import { getTags } from "../services/tag";

export default function CustomerPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [searchParams] = useSearchParams();

  const [customers, setCustomers] = useState([]);
  const [customerProducts, setCustomerProducts] = useState({});
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);

  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  /* ================= FETCH CUSTOMERS ================= */
  const loadCustomers = async () => {
    try {
      setLoading(true);

      const params = Object.fromEntries([...searchParams]);

      const res = isAdmin
        ? await getCustomers(params)
        : await getMyCustomers(params);

      const list = res.data || [];
      setCustomers(list);

      const productMap = {};
      for (const c of list) {
        try {
          const p = await getCustomerProducts(c.id);
          productMap[c.id] = p.data;
        } catch {
          productMap[c.id] = [];
        }
      }
      setCustomerProducts(productMap);
    } finally {
      setLoading(false);
    }
  };

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    async function loadInitial() {
      await loadCustomers();

      // TAGS herkese
      const tagRes = await getTags();
      setTags(tagRes.data || []);

      // USERS sadece admin
      if (isAdmin) {
        const userRes = await getUsers();
        setUsers(userRes.data || []);
      }
    }

    loadInitial();
  }, []);

  /* ================= FILTER CHANGE ================= */
  useEffect(() => {
    loadCustomers();
  }, [searchParams.toString()]);

  if (loading) return <div>Loading customers...</div>;

  return (
    <div className="customer-page-wrapper">
      <div className="customer-page-header">
        <h1>Müşteri Yönetimi</h1>
        <p>Müşterileri görüntüleyin ve yönetin</p>
      </div>

      <CustomerPageActions
        onOpenFilter={() => setFilterOpen(true)}
        onOpenCreate={() => setCreateOpen(true)}
      />

      <CustomerFilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        users={users}
        tags={tags}
        isAdmin={isAdmin}
      />

      <CustomerCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        tags={tags}
        onSuccess={loadCustomers}
      />

      <TagStatistics customers={customers} />

      <CustomerList
        customers={customers}
        customerProducts={customerProducts}
      />
    </div>
  );
}
