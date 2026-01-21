import React, { useEffect, useMemo, useState } from "react";
import { getProducts } from "../../../services/product";
import { toast } from "react-hot-toast";
import "./eventStyles.css";
import ConfirmModal from "../../common/ConfirmModal";
import { APPOINTMENT_STATUS, APPOINTMENT_TYPES } from "./eventConstants";

/** ✅ Dakikayı bir sonraki 5 dakikaya yuvarla */
const roundToNext5 = (d = new Date()) => {
  const date = new Date(d);
  date.setSeconds(0, 0);
  const m = date.getMinutes();
  const next = Math.ceil(m / 5) * 5;

  if (next === 60) {
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
  } else {
    date.setMinutes(next);
  }

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return { hh, mm };
};

const normalizeScheduledForToLocalInput = (value) => {
  // Beklenen: "YYYY-MM-DDTHH:mm" (datetime-local formatı)
  // Backend bazen "YYYY-MM-DDTHH:mm:ssZ" vs döndürebilir, ilk 16 karakter yeterli.
  if (!value) return "";
  const s = String(value).replace(" ", "T");
  return s.slice(0, 16);
};

const EventModal = ({ isOpen, onClose, onSave, onDelete, event, customerId }) => {
  if (!isOpen) return null;

  const isEdit = Boolean(event);

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    product_id: "",
    appointment_type: "muayene",
    status: "beklemede",
    scheduled_for: "", // "YYYY-MM-DDTHH:mm"
    notes: "",
  });

  // ✅ User-friendly: Tarih + Saat + Dakika ayrı (5 dk aralık)
  const [datePart, setDatePart] = useState(""); // "YYYY-MM-DD"
  const [hourPart, setHourPart] = useState(() => roundToNext5().hh); // "HH"
  const [minutePart, setMinutePart] = useState(() => roundToNext5().mm); // "00..55"

  const minutes5 = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")),
    []
  );
  const hours24 = useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")),
    []
  );

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

  /* ---------------- scheduled_for sync ---------------- */
  useEffect(() => {
    if (!datePart) {
      setForm((p) => ({ ...p, scheduled_for: "" }));
      return;
    }
    setForm((p) => ({
      ...p,
      scheduled_for: `${datePart}T${hourPart}:${minutePart}`,
    }));
  }, [datePart, hourPart, minutePart]);

  /* ---------------- FILL FORM (EDIT) ---------------- */
  useEffect(() => {
    if (isEdit && event && products.length > 0) {
      const productObj = products.find((p) => p.name === event.product);

      const scheduled = normalizeScheduledForToLocalInput(event.scheduled_for);
      const d = scheduled ? scheduled.split("T")[0] : "";
      const t = scheduled ? scheduled.split("T")[1] : "";
      const fallback = `${roundToNext5().hh}:${roundToNext5().mm}`;
      const [hh, mm] = (t || fallback).split(":");

      setForm({
        name: event.name || "",
        product_id: productObj?.id || "",
        appointment_type: event.appointment_type || "muayene",
        status: event.status || "beklemede",
        scheduled_for: scheduled || "",
        notes: event.notes || "",
      });

      setDatePart(d);
      setHourPart(hh || roundToNext5().hh);

      // ✅ Dakika 5'in katı değilse bir sonraki 5'e yuvarla
      if (minutes5.includes(mm)) {
        setMinutePart(mm);
      } else {
        // basit yuvarlama
        const mNum = Number(mm);
        const next = Math.ceil(mNum / 5) * 5;
        setMinutePart(String(next === 60 ? 0 : next).padStart(2, "0"));
      }
    }

    if (!isEdit) {
      const { hh, mm } = roundToNext5();
      setForm({
        name: "",
        product_id: "",
        appointment_type: "muayene",
        status: "beklemede",
        scheduled_for: "",
        notes: "",
      });
      setDatePart("");
      setHourPart(hh);
      setMinutePart(mm);
    }
  }, [isEdit, event, products, minutes5]);

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
      scheduled_for: form.scheduled_for, // ✅ "YYYY-MM-DDTHH:mm"
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

        {/* ✅ DATE + HOUR + MINUTE (5 dk aralık) */}
        <div className="modal-row">
          <div className="modal-field">
            <label>Tarih</label>
            <input
              type="date"
              className={`modal-input ${errors.scheduled_for ? "input-error" : ""}`}
              value={datePart}
              onChange={(e) => setDatePart(e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label>Saat</label>
            <select
              className={`modal-input ${errors.scheduled_for ? "input-error" : ""}`}
              value={hourPart}
              onChange={(e) => setHourPart(e.target.value)}
            >
              {hours24.map((hh) => (
                <option key={hh} value={hh}>
                  {hh}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label>Dakika</label>
            <select
              className={`modal-input ${errors.scheduled_for ? "input-error" : ""}`}
              value={minutePart}
              onChange={(e) => setMinutePart(e.target.value)}
            >
              {minutes5.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errors.scheduled_for && (
          <p className="input-error-msg">{errors.scheduled_for[0]}</p>
        )}

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
