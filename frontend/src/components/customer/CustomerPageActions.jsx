import React from "react";
import {
  Archive,
  Download,
  Upload,
  Filter,
  PencilRuler,
  UserPlus,
  ClipboardList,
} from "lucide-react";
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
  const archiveTitle = archiveMode ? "Aktif + Pool" : "Arşiv";
  const bulkTitle =
    selectedCount === 0
      ? "Toplu Güncelle - Önce müşteri seçmelisin"
      : `Toplu Güncelle - ${selectedCount} müşteri seçili`;
  const importTitle = excelUploading ? "İçe Aktarılıyor..." : "İçe Aktar";

  return (
    <div className="customer-actions">
      <div className="customer-actions-left">
        <button
          className="btn-secondary customer-action-icon-button"
          onClick={onOpenFilter}
          title="Filtrele"
          aria-label="Filtrele"
          type="button"
        >
          <Filter size={18} strokeWidth={2} />
        </button>

        {/*<button className="btn-secondary">🗂 Havuz</button>*/}
      </div>

      <div className="customer-actions-right">
        {isAdmin && (
          <button
            className="btn-secondary customer-action-icon-button"
            onClick={onOpenArchive}
            title={archiveTitle}
            aria-label={archiveTitle}
            type="button"
          >
            {archiveMode ? (
              <ClipboardList size={18} strokeWidth={2} />
            ) : (
              <Archive size={18} strokeWidth={2} />
            )}
          </button>
        )}

        {isAdmin && (
          <button
            className="btn-secondary customer-action-icon-button"
            onClick={onOpenBulkUpdate}
            disabled={selectedCount === 0}
            title={bulkTitle}
            aria-label="Toplu Güncelle"
            type="button"
          >
            <PencilRuler size={18} strokeWidth={2} />
            {selectedCount > 0 ? (
              <span className="customer-action-badge" aria-hidden="true">
                {selectedCount}
              </span>
            ) : null}
          </button>
        )}

        {isAdmin && (
          <ExportActionButton
            model={exportModel}
            initialRecipientEmail={currentUserEmail}
            buttonClassName="btn-secondary customer-action-icon-button"
            buttonLabel={<Upload size={18} strokeWidth={2} />}
            buttonTitle="Dışa Aktar"
            ariaLabel="Dışa Aktar"
          />
        )}

        {isAdmin && (
          <button
            className="btn-secondary customer-action-icon-button"
            onClick={onExcelImport}
            disabled={excelUploading}
            title={importTitle}
            aria-label="Import"
            type="button"
            style={{
              opacity: excelUploading ? 0.6 : 1,
              cursor: excelUploading ? "not-allowed" : "pointer",
            }}
          >
            <Download size={18} strokeWidth={2} />
          </button>
        )}

        <button
          className="btn-primary customer-action-icon-button"
          onClick={onOpenCreate}
          title="Müşteri Ekle"
          aria-label="Müşteri Ekle"
          type="button"
        >
          <UserPlus size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
