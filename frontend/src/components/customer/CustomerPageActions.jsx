import React from "react";
import "../../assets/css/CustomerActions.css";
import ExportActionButton from "../export/ExportActionButton.jsx";

export default function CustomerPageActions({
  onOpenFilter,
  onOpenCreate,
  onExcelImport,
  onOpenBulkUpdate,
  onOpenArchive,
  isAdmin,
  exportModel = "customer",
  currentUserEmail = "",
  excelUploading,
  selectedCount = 0,
  archiveMode = false,
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
          <button className="btn-secondary" onClick={onOpenArchive}>
            {archiveMode ? "📋 Aktif + Pool" : "🗄 Archive"}
          </button>
        )}

        {isAdmin && (
          <button
            className="btn-secondary"
            onClick={onOpenBulkUpdate}
            disabled={selectedCount === 0}
            title={
              selectedCount === 0
                ? "Önce müşteri seçmelisin"
                : `${selectedCount} müşteri seçili`
            }
          >
            🧩 Toplu Güncelle {selectedCount > 0 ? `(${selectedCount})` : ""}
          </button>
        )}

        {isAdmin && (
          <ExportActionButton
            model={exportModel}
            initialRecipientEmail={currentUserEmail}
            buttonClassName="btn-secondary"
            buttonLabel="⬇️ Export"
          />
        )}

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
