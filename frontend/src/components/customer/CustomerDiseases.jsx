// src/components/customer/CustomerDiseases.jsx
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { SquarePen, HeartPulse } from "lucide-react";

import "../../assets/css/CustomerDetailPage.css";

import { getProducts } from "../../services/product";
import {
  addCustomerProduct,
  deleteCustomerProduct,
} from "../../services/customerProducts";

import ConfirmModal from "../common/ConfirmModal";

export default function CustomerDiseases({
  customerId,
  customerProducts = [],
  onReload,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProducts()
      .then((res) => setAllProducts(res.data))
      .catch(() => toast.error("Hastalıklar yüklenemedi"));
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    setSelectedProducts(
      customerProducts.map((cp) => cp.product_id_read)
    );
  }, [isEditing, customerProducts]);

  const toggleDisease = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

const saveDiseases = async () => {
  if (saving) return;

  setSaving(true);

  try {
    const currentIds = customerProducts.map(
      (cp) => cp.product_id_read
    );

    const toAdd = selectedProducts.filter(
      (id) => !currentIds.includes(id)
    );

    const toRemove = customerProducts.filter(
      (cp) => !selectedProducts.includes(cp.product_id_read)
    );

    const deleteRequests = toRemove.map((cp) =>
      deleteCustomerProduct(cp.id)
    );

    const addRequests = toAdd.map((pid) =>
      addCustomerProduct({
        customer_id: customerId,
        product_id: pid,
      })
    );

    // Bekleyen tüm işlemleri bitir, ardından veriyi yenile
    await Promise.all([...deleteRequests, ...addRequests]);

    if (onReload) {
      await onReload();
    }

    toast.success("Hastalıklar güncellendi");
    setIsEditing(false);
    setShowConfirm(false);
  } catch (err) {
    console.error(err);
    toast.error("Hastalıklar güncellenemedi");
  } finally {
    setSaving(false);
  }
};


  /* -------- UI -------- */

  return (
    <div className="customer-diseases">
      <div className="section-header">
        <label><HeartPulse size={13} /> Hastalıklar</label>

        {!isEditing && (
          <button
            className="icon-btn"
            title="Hastalıkları düzenle"
            onClick={() => setIsEditing(true)}
          >
            <SquarePen size={16} />
          </button>
        )}
      </div>

      {!isEditing ? (
        customerProducts.length === 0 ? (
          <span>-</span>
        ) : (
          <div className="disease-list">
            {customerProducts.map((d) => (
              <span key={d.id} className="badge disease-badge">
                {d.product}
              </span>
            ))}
          </div>
        )
      ) : (
        <>
          {/* EDIT LIST – MINIMAL */}
          <div className="disease-edit-grid">
            {allProducts.map((p) => (
              <label
                key={p.id}
                className="checkbox-item minimal"
              >
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.id)}
                  onChange={() => toggleDisease(p.id)}
                />
                <span>{p.name}</span>
              </label>
            ))}
          </div>

          {/* ACTIONS */}
          <div className="customer-edit-actions">
            <button
              className="btn-secondary"
              disabled={saving}
              onClick={() => setIsEditing(false)}
            >
              İptal
            </button>
            <button
              className="btn-primary"
              disabled={saving}
              onClick={() => setShowConfirm(true)}
            >
              Kaydet
            </button>
          </div>
        </>
      )}

      <ConfirmModal
        open={showConfirm}
        title="Hastalıkları Güncelle"
        description="Seçilen hastalıklar kaydedilecek. Emin misiniz?"
        confirmText="Evet, Kaydet"
        cancelText="Vazgeç"
        onCancel={() => setShowConfirm(false)}
        onConfirm={saveDiseases}
      />
    </div>
  );
}
