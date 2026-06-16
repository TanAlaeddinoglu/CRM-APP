// src/components/customer/CustomerCreateModal.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { createCustomer } from "../../services/customer";
import { getProducts } from "../../services/product";
import { getUsers } from "../../services/user";
import { addCustomerProduct } from "../../services/customerProducts";
import { toast } from "react-hot-toast";
import "../../assets/css/CustomerCreateModal.css";

const ADMIN_STATUS_CHOICES = ["active", "archived", "quarantine", "pool"];

export default function CustomerCreateModal({
  isOpen,
  onClose,
  onSuccess,
  tags = [],
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  /* ---------- STATE ---------- */

  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [showProducts, setShowProducts] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    customer_surname: "",
    customer_email: "",
    customer_phone: "",
    city: "",
    date_of_birth: "",
    status: "active",
    tag: "",
    assigned_to: "",
    products: [],
  });

  /* ---------- FETCH PRODUCTS ---------- */

  useEffect(() => {
    if (!isOpen) return;

    getProducts()
      .then((res) => setProducts(res.data))
      .catch(() => toast.error("Hastalıklar yüklenemedi"));
  }, [isOpen]);

  /* ---------- FETCH USERS (ADMIN ONLY) ---------- */

  useEffect(() => {
    if (!isOpen || !isAdmin) return;

    getUsers()
      .then((res) => {
        // sadece aktif kullanıcılar
        const activeUsers = res.data.filter(
          (u) => u.is_active !== false
        );
        setUsers(activeUsers);
      })
      .catch(() => toast.error("Kullanıcılar yüklenemedi"));
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  /* ---------- HANDLERS ---------- */

  const handleChange = (field, value) => {
    setForm((prev) => {
      if (field === "status" && value === "pool") {
        setShowProducts(false);
        return {
          ...prev,
          status: value,
          tag: "",
          assigned_to: "",
          products: [],
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const toggleProduct = (productId) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.includes(productId)
        ? prev.products.filter((id) => id !== productId)
        : [...prev.products, productId],
    }));
  };

  /* ---------- SUBMIT ---------- */

  const handleSubmit = async () => {
    if (!form.customer_name || !form.customer_surname) {
      toast.error("Ad ve soyad zorunludur");
      return;
    }

    if (form.status !== "pool" && !form.tag) {
      toast.error("Pool dışındaki müşteriler için tag zorunludur");
      return;
    }

    const rawPhone = form.customer_phone;
    const normalizedPhone = rawPhone.startsWith("0") ? "9" + rawPhone : rawPhone;
    if (rawPhone) {
      const digits = normalizedPhone.replace(/\D/g, "");
      if (digits.length === 10) {
        toast.error("Telefon numarası geçersiz");
        return;
      }
    }

    try {
      /* 1️⃣ CUSTOMER CREATE */
      const customerRes = await createCustomer({
        customer_name: form.customer_name,
        customer_surname: form.customer_surname,
        customer_email: form.customer_email,
        customer_phone: normalizedPhone || form.customer_phone,
        city: form.city,
        date_of_birth: form.date_of_birth || null,
        status: isAdmin ? form.status : "active",

        ...(form.status !== "pool" && {
          tag_id: Number(form.tag),
          assigned: isAdmin
            ? Number(form.assigned_to || null)
            : user.id,
        }),
      });

      const customerId = customerRes?.data?.id;
      if (!customerId) throw new Error("Customer ID alınamadı");

      /* 2️⃣ CUSTOMER → HASTALIKLAR */
      await Promise.all(
        form.products.map((productId) =>
          addCustomerProduct({
            customer_id: customerId,
            product_id: productId,
          })
        )
      );

      toast.success("Müşteri oluşturuldu");
      onClose();
      onSuccess();
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("Müşteri oluşturulamadı");
    }
  };

  /* ---------- UI ---------- */

  return (
    <div className="modal-background">
      <div className="modal-box modal-box-md">
        <h3>Yeni Müşteri</h3>

        <div className="modal-form-grid">
          <input
            placeholder="Ad"
            onChange={(e) =>
              handleChange("customer_name", e.target.value)
            }
          />
          <input
            placeholder="Soyad"
            onChange={(e) =>
              handleChange("customer_surname", e.target.value)
            }
          />

          <input
            className="full"
            placeholder="E-posta"
            onChange={(e) =>
              handleChange("customer_email", e.target.value)
            }
          />
          <div className="field-with-hint">
            <input
              placeholder="Telefon"
              onChange={(e) =>
                handleChange("customer_phone", e.target.value)
              }
            />
            <span className="input-hint">Örnek:+90532xxxxxxx</span>
          </div>
          <input
            placeholder="Şehir"
            onChange={(e) => handleChange("city", e.target.value)}
          />
          <input
            type="date"
            onChange={(e) =>
              handleChange("date_of_birth", e.target.value)
            }
          />

          {/* STATUS – ADMIN */}
          {isAdmin && (
            <select
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value)
              }
            >
              {ADMIN_STATUS_CHOICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {/* TAG */}
          <select
            className="full"
            value={form.tag}
            disabled={form.status === "pool"}
            onChange={(e) => handleChange("tag", e.target.value)}
          >
            <option value="">
              {form.status === "pool"
                ? "Pool için tag atanamaz"
                : "Tag seçiniz"}
            </option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tag_name}
              </option>
            ))}
          </select>

          {/* 👑 ADMIN – USER ASSIGN */}
          {isAdmin && (
            <select
              className="full"
              value={form.assigned_to}
              disabled={form.status === "pool"}
              onChange={(e) =>
                handleChange("assigned_to", e.target.value)
              }
            >
              <option value="">
                {form.status === "pool"
                  ? "Pool için kullanıcı atanamaz"
                  : "Kullanıcı seçiniz"}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          )}

          {/* HASTALIKLAR */}
          <div className="full">
            <div
              className={`dropdown-header ${
                form.status === "pool" ? "disabled" : ""
              }`}
              onClick={() =>
                form.status !== "pool" &&
                setShowProducts((p) => !p)
              }
            >
              <span>
                Hastalıklar
                {form.products.length > 0 && (
                  <small className="selected-count">
                    ({form.products.length} seçildi)
                  </small>
                )}
              </span>
              <span className="dropdown-arrow">
                {showProducts ? "▲" : "▼"}
              </span>
            </div>

            {showProducts && (
              <div className="dropdown-content">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="checkbox-row"
                    onClick={() => toggleProduct(p.id)}
                  >
                    <input
                      type="checkbox"
                      checked={form.products.includes(p.id)}
                      readOnly
                    />
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            İptal
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
