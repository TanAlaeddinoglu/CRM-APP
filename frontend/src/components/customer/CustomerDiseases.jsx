// src/components/customer/CustomerDiseases.jsx
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { SquarePen } from "lucide-react";
import "../../assets/css/CustomerDetailPage.css";

import { getProducts } from "../../services/product";
import {
  addCustomerProduct,
  deleteCustomerProduct,
} from "../../services/customerProducts";

export default function CustomerDiseases({
  customerId,
  customerProducts = [],
  onReload,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  /* -------- FETCH ALL PRODUCTS -------- */
  useEffect(() => {
    getProducts()
      .then((res) => setAllProducts(res.data))
      .catch(() => toast.error("Hastalıklar yüklenemedi"));
  }, []);

  /* -------- SYNC SELECTED WHEN EDIT -------- */
  useEffect(() => {
    if (!isEditing) return;

    setSelectedProducts(
      customerProducts.map((cp) => cp.product_id)
    );
  }, [isEditing, customerProducts]);

  const toggleDisease = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  /* -------- SAVE -------- */
  const handleSave = async () => {
    try {
      const currentIds = customerProducts.map(
        (cp) => cp.product_id
      );

      const toAdd = selectedProducts.filter(
        (id) => !currentIds.includes(id)
      );

      const toRemove = customerProducts.filter(
        (cp) => !selectedProducts.includes(cp.product_id)
      );

      // önce sil
      for (const item of toRemove) {
        await deleteCustomerProduct(item.id);
      }

      // sonra ekle
      for (const pid of toAdd) {
        try {
          await addCustomerProduct({
            customer_id: customerId,
            product_id: pid,
          });
        } catch (err) {
          console.warn("Skip duplicate:", err?.response?.data);
        }
      }

      toast.success("Hastalıklar güncellendi");
      setIsEditing(false);
      onReload();
    } catch (err) {
      console.error(err);
      toast.error("Hastalıklar güncellenemedi");
    }
  };

  return (
    <div className="customer-diseases">
      <div className="section-header">
        <label>Hastalıklar</label>

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
          <div className="disease-edit-list">
            {allProducts.map((p) => (
              <label key={p.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.id)}
                  onChange={() => toggleDisease(p.id)}
                />
                <span>{p.name}</span>
              </label>
            ))}
          </div>

          <div className="customer-edit-actions">
            <button
              className="btn-secondary"
              onClick={() => setIsEditing(false)}
            >
              İptal
            </button>
            <button className="btn-primary" onClick={handleSave}>
              Kaydet
            </button>
          </div>
        </>
      )}
    </div>
  );
}
