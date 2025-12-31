// src/pages/CustomerPage.jsx
import React, {useEffect, useState} from "react";
import {useAuth} from "../context/AuthContext.jsx";
import {useSearchParams} from "react-router-dom";

import CustomerList from "../components/CustomerList.jsx";
import TagStatistics from "../components/TagStatistics.jsx";
import CustomerPageActions from "../components/customer/CustomerPageActions.jsx";
import CustomerFilterModal from "../components/customer/CustomerFilterModal.jsx";
import CustomerCreateModal from "../components/customer/CustomerCreateModal.jsx";

import {getCustomers, getMyCustomers} from "../services/customer.js";
import {getUsers} from "../services/user.js";
import {getTags} from "../services/tag.js";

export default function CustomerPage() {
    const {user} = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const [searchParams] = useSearchParams();

    const [customers, setCustomers] = useState([]);
    const [users, setUsers] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filterOpen, setFilterOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [totalCount, setTotalCount] = useState(0);




    const loadCustomers = async () => {
        setLoading(true);
        const params = Object.fromEntries([...searchParams]);

        const res = isAdmin
            ? await getCustomers(params)
            : await getMyCustomers(params);

        // DRF pagination uyumlu
        setCustomers(res.data?.results || []);
        setTotalCount(res.data?.count || 0);

        setLoading(false);
    };


    useEffect(() => {
        async function init() {
            await loadCustomers();

            const tagRes = await getTags();
            setTags(tagRes.data || []);

            if (isAdmin) {
                const userRes = await getUsers();
                setUsers(userRes.data || []);
            }
        }

        init();
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [searchParams.toString()]);

    if (loading) return <div>Loading customers...</div>;

    return (
        <div className="customer-page-wrapper">

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
                totalCount={totalCount}
            />

        </div>
    );
}
