import React, {useEffect, useState} from "react";
import {getProducts} from "../../../services/product";
import {toast} from "react-hot-toast";
import "./eventStyles.css";

const APPOINTMENT_TYPES = [
    {value: "muayene", label: "Muayene"},
    {value: "ameliyat", label: "Ameliyat"},
    {value: "tedavi", label: "Tedavi"}
];

const APPOINTMENT_STATUS = [
    {value: "beklemede", label: "Beklemede"},
    {value: "satis", label: "Satış"},
    {value: "olumsuz", label: "Olumsuz"}
];

const EventModal = ({isOpen, onClose, onSave, onDelete, event, customerId}) => {
    if (!isOpen) return null;

    const isEdit = Boolean(event);

    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        name: "",
        product_id: "",
        appointment_type: "muayene",
        status: "beklemede",
        scheduled_for: "",
        notes: "",
    });

    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);


    /* -----------------------------
          ÜRÜNLERİ YÜKLE
    ----------------------------- */
    useEffect(() => {
        async function loadProducts() {
            try {
                const res = await getProducts();
                setProducts(res.data);
            } catch (err) {
                console.error("Product load error:", err);
                toast.error("Ürünler yüklenirken hata oluştu.");
            }
        }

        loadProducts();
    }, []);

    /* -----------------------------
          FORMU DOLDUR (Edit Mode)
    ----------------------------- */
    useEffect(() => {
        if (isEdit && event && products.length > 0) {
            const productObj = products.find((p) => p.name === event.product);

            setForm({
                name: event.name || "",
                product_id: productObj ? productObj.id : "",
                appointment_type: event.appointment_type || "muayene",
                status: event.status || "beklemede",
                scheduled_for: event.scheduled_for || "",
                notes: event.notes || "",
            });
        }

        if (!isEdit) {
            setForm({
                name: "",
                product_id: "",
                appointment_type: "muayene",
                status: "beklemede",
                scheduled_for: "",
                notes: "",
            });
        }
    }, [isEdit, event, products]);

    /* -----------------------------
          INPUT CHANGE
    ----------------------------- */
    const handleChange = (field, value) => {
        setForm((prev) => ({...prev, [field]: value}));

        // ilgili field'ın hatasını temizle
        setErrors((prev) => ({...prev, [field]: null}));
    };

    /* -----------------------------
          SUBMIT HANDLER
    ----------------------------- */
    const handleSubmit = async () => {
        setErrors({});
        setSubmitError("");
        setIsSubmitting(true);

        const payload = {
            customer_id: customerId,
            product_id: form.product_id,
            name: form.name,
            appointment_type: form.appointment_type,
            status: form.status,
            scheduled_for: form.scheduled_for,
            notes: form.notes,
        };

        try {
            await onSave(payload); // parent component'te try/catch var

            if (isEdit) toast.success("Randevu güncellendi.");
            else toast.success("Randevu oluşturuldu.");

        } catch (err) {
            setIsSubmitting(false);
            console.log("ERR:", err);

            if (err.response?.status === 400) {
                const data = err.response.data;
                setErrors(data);
                setSubmitError("Lütfen hatalı alanları düzeltin.");
                toast.error("Formda hatalar var.");
            } else {
                setSubmitError("Beklenmeyen bir hata oluştu.");
                toast.error("Beklenmeyen hata!");
            }
            return;
        }

        setIsSubmitting(false);
    };

    const formatDateInput = (value) => {
        if (!value) return "";
        return value.slice(0, 16);
    };

    return (
        <div className="modal-background">
            <div className="modal-box modal-box-sm">

                <h2 className="modal-title">
                    {isEdit ? "Randevuyu Düzenle" : "Yeni Randevu"}
                </h2>

                {/* GENEL ERROR BOX */}
                {submitError && (
                    <div className="modal-error-box">{submitError}</div>
                )}

                {/* NAME */}
                <div className="modal-field">
                    <label>Randevu Adı</label>
                    <input
                        className={`modal-input ${errors.name ? "input-error" : ""}`}
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                    />
                    {errors.name && (
                        <p className="input-error-msg">{errors.name[0]}</p>
                    )}
                </div>

                {/* PRODUCT */}
                <div className="modal-field">
                    <label>Ürün</label>
                    <select
                        className={`modal-input ${errors.product_id ? "input-error" : ""}`}
                        value={form.product_id}
                        onChange={(e) => handleChange("product_id", Number(e.target.value))}
                    >
                        <option value="">Seçiniz</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    {errors.product_id && (
                        <p className="input-error-msg">{errors.product_id[0]}</p>
                    )}
                </div>

                {/* TYPE + STATUS */}
                <div className="modal-row">
                    <div className="modal-field">
                        <label>Tür</label>
                        <select
                            className="modal-input"
                            value={form.appointment_type}
                            onChange={(e) => handleChange("appointment_type", e.target.value)}
                        >
                            {APPOINTMENT_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="modal-field">
                        <label>Durum</label>
                        <select
                            className="modal-input"
                            value={form.status}
                            onChange={(e) => handleChange("status", e.target.value)}
                        >
                            {APPOINTMENT_STATUS.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* DATE */}
                <div className="modal-field">
                    <label>Tarih / Saat</label>
                    <input
                        type="datetime-local"
                        className={`modal-input ${errors.scheduled_for ? "input-error" : ""}`}
                        value={formatDateInput(form.scheduled_for)}
                        onChange={(e) => handleChange("scheduled_for", e.target.value)}
                    />
                    {errors.scheduled_for && (
                        <p className="input-error-msg">{errors.scheduled_for[0]}</p>
                    )}
                </div>

                {/* NOTES */}
                <div className="modal-field">
                    <label>Not</label>
                    <textarea
                        rows={3}
                        className="modal-textarea"
                        value={form.notes}
                        onChange={(e) => handleChange("notes", e.target.value)}
                    />
                </div>

                {/* ACTION BUTTONS */}
                <div className="modal-actions">
                    {isEdit && (
                        <button
                            className="modal-delete"
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                        >
                            Sil
                        </button>

                    )}

                    <div className="modal-actions-right">
                        <button className="modal-cancel" type="button" onClick={onClose}>
                            İptal
                        </button>

                        <button
                            className="modal-save"
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                    </div>
                </div>
                {/* --------- DELETE CONFIRM POPUP --------- */}
                {confirmDelete && (
                    <div className="confirm-popup">
                        <div className="confirm-box">
                            <p className="confirm-text">
                                Bu randevuyu silmek istediğine emin misin?
                            </p>

                            <div className="confirm-buttons">
                                <button
                                    className="confirm-cancel"
                                    onClick={() => setConfirmDelete(false)}
                                >
                                    Vazgeç
                                </button>

                                <button
                                    className="confirm-ok"
                                    onClick={() => {
                                        onDelete(event.id);
                                        setConfirmDelete(false);
                                    }}
                                >
                                    Evet, Sil
                                </button>
                            </div>
                        </div>
                    </div>
                )}


            </div>
        </div>
    );
};

export default EventModal;
