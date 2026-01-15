import React from "react";
import "../../assets/css/CustomerActions.css";

export default function CustomerPageActions({
  onOpenFilter,
  onOpenCreate,
  onExcelImport,
  isAdmin,
  excelUploading,
}) {
  return (
    <div className="customer-actions">
      <div className="customer-actions-left">
        <button className="btn-secondary" onClick={onOpenFilter}>
          🔍 Filtrele
        </button>

        {/*<button className="btn-secondary">🗂 Havuz</button>*/}
      </div>

      <div className="customer-actions-right">
        {isAdmin && (
          <button
            className="btn-secondary"
            onClick={onExcelImport}
            disabled={excelUploading}
            style={{
              opacity: excelUploading ? 0.6 : 1,
              cursor: excelUploading ? "not-allowed" : "pointer",
            }}
          >
            {excelUploading ? "⏳ Yükleniyor..." : "📄 Excel"}
          </button>
        )}

        <button className="btn-primary" onClick={onOpenCreate}>
          + Müşteri Ekle
        </button>
      </div>
    </div>
  );
}
