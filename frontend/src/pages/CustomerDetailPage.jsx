// src/pages/CustomerDetailPage.jsx
import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {useAuth} from "../context/AuthContext";

import {
    getCustomerById,
    updateCustomer,
} from "../services/customer";
import {getCustomerProducts} from "../services/customerProducts";

import CustomerDetailInfo from "../components/customer/CustomerDetailInfo";
import CustomerTagHistory from "../components/customer/CustomerTagHistory";
import CustomerEventsSection from "../components/customer/events/CustomerEventsSection";
import CustomerNotesSection from "../components/customer/CustomerNotesSection";
import CustomerPaymentsSection from "../components/customer/payments/CustomerPaymentsSection";
import LoadingIndicator from "../components/common/LoadingIndicator.jsx";
import { usePageTransition } from "../context/PageTransitionContext.jsx";

import "../assets/css/CustomerDetailPage.css";

export default function CustomerDetailPage() {
    const {id} = useParams();
    const {user} = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [customer, setCustomer] = useState(null);
    const [customerProducts, setCustomerProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    usePageTransition(loading);

    useEffect(() => {
        loadCustomer();
    }, [id, isAdmin]);

const loadCustomer = async () => {
  setLoading(true);

  try {
    const res = await getCustomerById(id, isAdmin);
    setCustomer(res.data);

    const prodRes = await getCustomerProducts(id);
    setCustomerProducts(prodRes.data);

    return true; // 👈 sinyal
  } catch (err) {
    console.error("Customer load error:", err);
    throw err; // 🔥 ÇOK ÖNEMLİ
  } finally {
    setLoading(false);
  }
};


const handleCustomerUpdate = async (data) => {
  await updateCustomer(customer.id, data, isAdmin);
  await loadCustomer(); // artık gerçekten bekler
};





    if (loading || !customer) {
        return <LoadingIndicator inline label="Müşteri detayı yükleniyor" />;
    }

    return (
        <div className="customer-detail-container">

            {/* TWO-COLUMN ROW */}
            <div className="customer-columns">

                {/* LEFT PANEL */}
                <div className="customer-left">
                    <div className="customer-left-card">

                        <CustomerDetailInfo
                            customer={customer}
                            customerProducts={customerProducts}
                            onSave={handleCustomerUpdate}
                            onReload={loadCustomer}
                            isAdmin={isAdmin}
                        />

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

            {/* FULL-WIDTH PAYMENT SECTION — admin only */}
            {isAdmin && <CustomerPaymentsSection customerId={id}/>}

        </div>
    );
}
