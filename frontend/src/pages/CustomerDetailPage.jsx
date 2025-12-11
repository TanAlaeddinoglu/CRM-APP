// src/pages/CustomerDetailPage.jsx
import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {useAuth} from "../context/AuthContext";
import {getCustomerById} from "../services/customer";

import CustomerDetailInfo from "../components/customer/CustomerDetailInfo";
import CustomerTagSection from "../components/customer/CustomerTagSection";
import CustomerTagHistory from "../components/customer/CustomerTagHistory";
import CustomerEventsSection from "../components/customer/events/CustomerEventsSection";
import CustomerNotesSection from "../components/customer/CustomerNotesSection";

import "../assets/css/CustomerDetailPage.css";

export default function CustomerDetailPage() {
    const {id} = useParams();
    const {user} = useAuth();
    const [customer, setCustomer] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await getCustomerById(id, user.role === "ADMIN");
                setCustomer(res.data);
            } catch (err) {
                console.error("Customer load error:", err);
            }
        }

        load();
    }, [id, user.role]);

    if (!customer) return <div className="loading">Loading...</div>;

    return (
        <div className="customer-detail-container">

            {/* LEFT COMBINED PANEL */}
            <div className="customer-left">

                <div className="customer-left-card">

                    {/* CUSTOMER INFO */}
                    <CustomerDetailInfo customer={customer}/>
                    <div className="separator"></div>

                    <CustomerTagHistory customerId={customer.id}/>

                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="customer-right">
                <div className="customer-right-card">
                    <CustomerEventsSection customerId={id}/>
                    <div className="separator"></div>
                    <CustomerNotesSection customerId={id}/>
                </div>
            </div>

        </div>
    );
}
