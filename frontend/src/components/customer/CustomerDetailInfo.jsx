// src/components/customer/CustomerDetailInfo.jsx
import {useEffect, useMemo, useState} from "react";
import {toast} from "react-hot-toast";
import {SquarePen} from "lucide-react";

import "../../assets/css/CustomerDetailPage.css";

import {getTags} from "../../services/tag";
import {getUsers} from "../../services/user";
import CustomerDiseases from "./CustomerDiseases";
import ConfirmModal from "../common/ConfirmModal.jsx";

const STATUS_OPTIONS = ["active", "pool"];

export default function CustomerDetailInfo({
                                               customer,
                                               customerProducts = [],
                                               onSave,
                                               onReload,
                                               isAdmin = false,
                                           }) {
    const [isEditing, setIsEditing] = useState(false);

    const [showConfirm, setShowConfirm] = useState(false);


    const [tags, setTags] = useState([]);
    const [users, setUsers] = useState([]);

    const [form, setForm] = useState({
        customer_name: "",
        customer_surname: "",
        customer_email: "",
        customer_phone: "",
        city: "",
        assigned_to: "", // user id (string)
        tag: "", // tag id (string)
        status: "",
    });

    /* ---------- helpers ---------- */

    const handleChange = (k, v) => setForm((p) => ({...p, [k]: v}));

    // customer.tag -> tag_name geliyor; id lazım. tags gelince eşleştiriyoruz.
    const currentTagIdFromName = useMemo(() => {
        if (!customer?.tag || tags.length === 0) return "";
        const found = tags.find((t) => t.tag_name === customer.tag);
        return found ? String(found.id) : "";
    }, [customer, tags]);

    const resetFormFromCustomer = () => {
        if (!customer) return;

        setForm({
            customer_name: customer.customer_name ?? "",
            customer_surname: customer.customer_surname ?? "",
            customer_email: customer.customer_email ?? "",
            customer_phone: customer.customer_phone ?? "",
            city: customer.city ?? "",
            assigned_to: customer.assigned_to_id ? String(customer.assigned_to_id) : "",
            tag: currentTagIdFromName || "", // tags gelmediyse "" kalır (select'te "Mevcut" gösteriyoruz)
            status: customer.status ?? "",
        });
    };

    /* ---------- fetch tags ---------- */
    useEffect(() => {
        getTags()
            .then((res) => setTags(res.data))
            .catch(() => toast.error("Tagler yüklenemedi"));
    }, []);

    /* ---------- fetch users (admin only) ---------- */
    useEffect(() => {
        if (!isAdmin) return;

        getUsers()
            .then((res) => setUsers(res.data))
            .catch(() => toast.error("Kullanıcılar yüklenemedi"));
    }, [isAdmin]);

    /* ---------- sync customer -> form (customer değişince) ---------- */
    useEffect(() => {
        resetFormFromCustomer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer, currentTagIdFromName]);

    /* ---------- edit açılınca da güncel değerleri bas ---------- */
    useEffect(() => {
        if (!isEditing) return;
        resetFormFromCustomer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing]);

    /* ---------- permissions ---------- */

    // Edit modunda herkes input görür ama user disabled (tag hariç)
    const canEditAdminFields = isEditing && isAdmin;
    const canEditTag = isEditing;
    const canEditAssigned = isEditing && isAdmin;
    const canEditStatus = isEditing && isAdmin;

    /* ---------- save ---------- */

   const handleSave = async () => {
  try {
    /* =====================
       👤 USER FLOW
       ===================== */
    if (!isAdmin) {
      if (!form.tag) {
        toast.error("Tag seçmelisiniz");
        return;
      }

      await onSave({ tag: Number(form.tag) });
      toast.success("Tag güncellendi");
      setIsEditing(false);
      return;
    }

    /* =====================
       👑 ADMIN FLOW
       ===================== */

    const currentStatus = customer.status;
    const currentTagId = customer.tag_id || null;
    const currentAssignedId = customer.assigned_to_id || null;

    const nextStatus = form.status || currentStatus;
    const nextTagId =
      form.tag !== "" ? Number(form.tag) : currentTagId;
    const nextAssignedId =
      form.assigned_to !== ""
        ? Number(form.assigned_to)
        : currentAssignedId;

    /* ---- ACTIVE GUARD (sadece geçişte) ---- */
    const isGoingActive =
      currentStatus !== "active" && nextStatus === "active";

    if (isGoingActive && (!nextTagId || !nextAssignedId)) {
      toast.error(
        "Active durumu için Tag ve Atanan Kullanıcı zorunludur"
      );
      return;
    }

    const payload = {
      customer_name: form.customer_name,
      customer_surname: form.customer_surname,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      city: form.city,
    };

    /* ---- STATUS ---- */
    if (nextStatus !== currentStatus) {
      payload.status = nextStatus;

      // pool → bilinçli temizlik
      if (nextStatus === "pool") {
        payload.tag_id = null;
        payload.assigned = null;
      }
    }

    /* ---- TAG / ASSIGNED ---- */
    if (nextStatus !== "pool") {
      if (nextTagId !== currentTagId) {
        payload.tag_id = nextTagId;
      }

      if (nextAssignedId !== currentAssignedId) {
        payload.assigned = nextAssignedId;
      }
    }

    await onSave(payload);
    toast.success("Müşteri güncellendi");
    setIsEditing(false);
  } catch (err) {
    console.error("Update error:", err?.response?.data || err);
    toast.error("Güncelleme başarısız");
  }
};


    const handleCancel = () => {
        resetFormFromCustomer();
        setIsEditing(false);
    };

    /* ---------- UI ---------- */

    return (
        <div className="customer-info-section">
            {/* HEADER */}
            <div className="customer-info-header">
                <div className="customer-header-left">
                    {!isEditing ? (
                        <h2 className="customer-title">
                            {customer.customer_name} {customer.customer_surname}
                        </h2>
                    ) : (
                        <div className="inline-name-edit">
                            <input
                                className="edit-input"
                                value={form.customer_name}
                                disabled={!canEditAdminFields}
                                onChange={(e) => handleChange("customer_name", e.target.value)}
                            />
                            <input
                                className="edit-input"
                                value={form.customer_surname}
                                disabled={!canEditAdminFields}
                                onChange={(e) => handleChange("customer_surname", e.target.value)}
                            />
                        </div>
                    )}

                    {/* TAG BADGE (güncel tag adı) */}
                    {customer.tag && <span className="customer-tag-highlight">{customer.tag}</span>}
                </div>

                {!isEditing && (
                    <button className="icon-btn" title="Düzenle" onClick={() => setIsEditing(true)}>
                        <SquarePen size={18}/>
                    </button>
                )}
            </div>

            <div className="info-list">
                {/* EMAIL */}
                <Info
                    label="E-posta"
                    value={form.customer_email}
                    edit={isEditing && isAdmin}
                    onChange={(v) => handleChange("customer_email", v)}
                />

                {/* TELEFON */}
                <Info
                    label="Telefon"
                    value={form.customer_phone}
                    edit={isEditing && isAdmin}
                    onChange={(v) => handleChange("customer_phone", v)}
                />

                {/* ŞEHİR */}
                <Info
                    label="Şehir"
                    value={form.city}
                    edit={isEditing && isAdmin}
                    onChange={(v) => handleChange("city", v)}
                />

                {/* ASSIGNED USER */}
                <div className="info-item">
                    <label>Atanan Kullanıcı</label>

                    {!isEditing ? (
                        <span>{customer.assigned_to || "-"}</span>
                    ) : (
                        <select
                            className="edit-input"
                            value={form.assigned_to}
                            disabled={!canEditAssigned}
                            onChange={(e) =>
                                handleChange("assigned_to", e.target.value)
                            }
                        >
                            <option value="">
                                {customer.assigned_to
                                    ? `${customer.assigned_to}`
                                    : "Kullanıcı seçiniz"}
                            </option>

                            {users.filter((u) => u.is_active !== false).map((u) => (
                                <option key={u.id} value={String(u.id)}>
                                    {u.username}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* STATUS */}
                <div className="info-item">
                    <label>Durum</label>

                    {!isEditing ? (
                        <span>{customer.status}</span>
                    ) : (
                        <>
                            <select
                                className="edit-input"
                                value={form.status}
                                disabled={!canEditStatus}
                                onChange={(e) =>
                                    handleChange("status", e.target.value)
                                }
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>

                            <small className="status-helper-text">
                                Not: Active yapmak için Tag ve Atanan Kullanıcı atanmalı!
                            </small>
                        </>
                    )}
                </div>

                {/* TAG */}
                <div className="info-item">
                    <label>Tag</label>

                    {!isEditing ? (
                        <span>{customer.tag || "-"}</span>
                    ) : (
                        <select
                            className="edit-input"
                            value={form.tag}
                            disabled={!canEditTag}
                            onChange={(e) =>
                                handleChange("tag", e.target.value)
                            }
                        >
                            <option value="">
                                {customer.tag
                                    ? ` ${customer.tag}`
                                    : "Tag seçiniz"}
                            </option>

                            {tags.map((t) => (
                                <option key={t.id} value={String(t.id)}>
                                    {t.tag_name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>


            {/* ACTIONS */}
            {isEditing && (
                <div className="customer-edit-actions">
                    <button className="btn-secondary" onClick={handleCancel}>
                        İptal
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowConfirm(true)}
                    >
                        Kaydet
                    </button>

                </div>
            )}

            {/* DISEASES (herkes değiştirir) */}
            <CustomerDiseases
                customerId={customer.id}
                customerProducts={customerProducts}
                onReload={onReload}
            />
            <ConfirmModal
                open={showConfirm}
                title="Değişiklikleri Onayla"
                description="Yaptığınız değişiklikleri kaydetmek istiyor musunuz?"
                confirmText="Evet, Kaydet"
                cancelText="Vazgeç"
                onCancel={() => setShowConfirm(false)}
                onConfirm={async () => {
                    setShowConfirm(false);
                    await handleSave();
                }}
            >
            </ConfirmModal>

        </div>
    );
}

/* ---------- INFO ITEM ---------- */
function Info({label, value, edit, disabled = false, onChange}) {
    return (
        <div className="info-item">
            <label>{label}</label>
            {!edit ? (
                <span>{value || "-"}</span>
            ) : (
                <input
                    className="edit-input"
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
        </div>
    );
}
