import React, { useEffect, useState } from "react";
import { getProducts } from "../../../services/product";
import { toast } from "react-hot-toast";
import "./eventStyles.css";
import ConfirmModal from "../../common/ConfirmModal"; // 🔥 ortak confirm
import { APPOINTMENT_STATUS, APPOINTMENT_TYPES } from "./eventConstants";

const EventModal = ({ isOpen, onClose, onSave, onDelete, event, customerId }) => {
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

  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  /* ---------------- LOAD PRODUCTS ---------------- */
  useEffect(() => {
    getProducts()
      .then((res) => setProducts(res.data))
      .catch(() => toast.error("Ürünler yüklenemedi"));
  }, []);

  /* ---------------- FILL FORM (EDIT) ---------------- */
  useEffect(() => {
    if (isEdit && event && products.length > 0) {
      const productObj = products.find((p) => p.name === event.product);

      setForm({
        name: event.name || "",
        product_id: productObj?.id || "",
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

  /* ---------------- CHANGE ---------------- */
  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((e) => ({ ...e, [field]: null }));
  };

  /* ---------------- REAL SAVE ---------------- */
  const handleSubmitInternal = async () => {
    setIsSubmitting(true);
    setErrors({});
    setSubmitError("");

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
      await onSave(payload);
      toast.success(isEdit ? "Randevu güncellendi" : "Randevu oluşturuldu");
      onClose();
    } catch (err) {
      if (err.response?.status === 400) {
        setErrors(err.response.data);
        setSubmitError("Lütfen hatalı alanları düzeltin.");
        toast.error("Formda hatalar var");
      } else {
        setSubmitError("Beklenmeyen bir hata oluştu.");
        toast.error("Beklenmeyen hata");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="modal-background">
      <div className="modal-box modal-box-sm">
        <h2 className="modal-title">
          {isEdit ? "Randevuyu Düzenle" : "Yeni Randevu"}
        </h2>

        {submitError && <div className="modal-error-box">{submitError}</div>}

        {/* NAME */}
        <div className="modal-field">
          <label>Randevu Adı</label>
          <input
            className={`modal-input ${errors.name ? "input-error" : ""}`}
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
          {errors.name && <p className="input-error-msg">{errors.name[0]}</p>}
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
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
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
              onChange={(e) =>
                handleChange("appointment_type", e.target.value)
              }
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
            className={`modal-input ${
              errors.scheduled_for ? "input-error" : ""
            }`}
            value={form.scheduled_for?.slice(0, 16) || ""}
            onChange={(e) =>
              handleChange("scheduled_for", e.target.value)
            }
          />
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

        {/* ACTIONS */}
        <div className="modal-actions">
          {isEdit && (
            <button
              className="modal-delete"
              onClick={() => setShowConfirmDelete(true)}
            >
              Sil
            </button>
          )}

          <div className="modal-actions-right">
            <button className="modal-cancel" onClick={onClose}>
              İptal
            </button>
            <button
              className="modal-save"
              disabled={isSubmitting}
              onClick={() => setShowConfirmSave(true)}
            >
              Kaydet
            </button>
          </div>
        </div>

        {/* CONFIRM SAVE */}
        <ConfirmModal
          open={showConfirmSave}
          title="Kaydı Onayla"
          description="Bu randevuyu kaydetmek istiyor musunuz?"
          confirmText="Evet, Kaydet"
          cancelText="Vazgeç"
          onCancel={() => setShowConfirmSave(false)}
          onConfirm={() => {
            setShowConfirmSave(false);
            handleSubmitInternal();
          }}
        />

        {/* CONFIRM DELETE */}
        <ConfirmModal
          open={showConfirmDelete}
          title="Silme Onayı"
          description="Bu randevuyu silmek istediğinize emin misiniz?"
          confirmText="Evet, Sil"
          cancelText="Vazgeç"
          danger
          onCancel={() => setShowConfirmDelete(false)}
          onConfirm={() => {
            setShowConfirmDelete(false);
            onDelete(event.id);
          }}
        />
      </div>
    </div>
  );
};

export default EventModal;
