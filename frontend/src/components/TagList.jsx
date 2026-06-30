// src/components/TagList.jsx
import { useEffect, useMemo, useState } from "react";
import "../assets/css/ProductList.css";
import "../assets/css/TagList.css";
import PageCard from "./common/PageCard.jsx";
import { useAuth } from "../context/AuthContext";
import { getTags, createTag, updateTag, deleteTag } from "../services/tag";
import { toast } from "react-hot-toast";
import { Pencil, Plus, Search, Upload } from "lucide-react";
import ExportActionButton from "./export/ExportActionButton.jsx";
import LoadingIndicator from "./common/LoadingIndicator.jsx";
import { usePageTransition } from "../context/PageTransitionContext.jsx";

import AddTagModal from "./AddTagModal";
import EditTagModal from "./EditTagModal";

export default function TagList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageTransition(loading);

  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyWithDescription, setShowOnlyWithDescription] = useState(false);

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editTag, setEditTag] = useState(null);

  /* =========================
     LOAD TAGS
  ========================= */
  const loadTags = async () => {
    try {
      setLoading(true);
      const res = await getTags();
      setTags(res.data);
    } catch (err) {
      console.error("Tag load error:", err);
      toast.error("Etiketler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  /* =========================
     SORT
  ========================= */
  const sortedTags = useMemo(() => {
    let list = [...tags];

    if (sortConfig.key) {
      list.sort((a, b) => {
        const valA = a[sortConfig.key] || "";
        const valB = b[sortConfig.key] || "";

        if (sortConfig.direction === "asc") {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
    }

    return list;
  }, [tags, sortConfig]);

  /* =========================
     FILTER
  ========================= */
  const filteredTags = useMemo(() => {
    let list = [...sortedTags];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          (t.tag_name || "").toLowerCase().includes(term) ||
          (t.slug || "").toLowerCase().includes(term) ||
          (t.description || "").toLowerCase().includes(term)
      );
    }

    if (showOnlyWithDescription) {
      list = list.filter(
        (t) => t.description && t.description.trim() !== ""
      );
    }

    return list;
  }, [sortedTags, searchTerm, showOnlyWithDescription]);

  /* =========================
     ACTIONS
  ========================= */
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleAddTag = async (data) => {
    try {
      await createTag(data);
      await loadTags();
      setAddModalOpen(false);
      toast.success("Etiket başarıyla oluşturuldu.");
    } catch (err) {
      console.error("Create tag error:", err);
      toast.error("Etiket oluşturulamadı.");
    }
  };

  const handleEditSave = async (data) => {
    try {
      await updateTag(editTag.id, data);
      await loadTags();
      setEditTag(null);
      toast.success("Etiket güncellendi.");
    } catch (err) {
      console.error("Update tag error:", err);
      toast.error("Etiket güncellenemedi.");
    }
  };

  const handleDeleteTag = async (id) => {
    try {
      await deleteTag(id);
      toast.success("Etiket silindi.");
      setEditTag(null);
      await loadTags();
    } catch (err) {
      console.error("Delete tag error:", err);
      toast.error("Etiket silinemedi.");
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <PageCard className="tag-catalog-card">
      {/* HEADER */}
      <div className="tag-catalog-header">
        <div className="tag-catalog-heading">
          <h2 className="tag-catalog-title">Etiket Kataloğu</h2>
          <span className="tag-catalog-count">
            {filteredTags.length} etiket
          </span>
        </div>

      </div>

      <div className="tag-catalog-toolbar">
        <div className="tag-catalog-search-field">
          <Search size={18} />
          <input
            type="text"
            className="tag-catalog-search"
            placeholder="Etiket ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <label
          className="tag-catalog-checkbox"
        >
          <input
            type="checkbox"
            checked={showOnlyWithDescription}
            onChange={(e) =>
              setShowOnlyWithDescription(e.target.checked)
            }
          />
          <span>Açıklaması olanlar</span>
        </label>

        {isAdmin && (
          <div className="tag-catalog-export-action">
            <ExportActionButton
              model="tag"
              initialRecipientEmail={user?.email || ""}
              buttonClassName="btn-secondary customer-action-icon-button"
              buttonLabel={<Upload size={18} strokeWidth={2} />}
              buttonTitle="Dışa Aktar"
              ariaLabel="Dışa Aktar"
            />
          </div>
        )}

        {isAdmin && (
          <button
            className="btn-primary customer-action-icon-button"
            onClick={() => setAddModalOpen(true)}
            title="Etiket Ekle"
            aria-label="Etiket Ekle"
            type="button"
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="tag-catalog-table-wrap">
        {loading ? (
          <div className="tag-catalog-state">
            <LoadingIndicator inline label="Etiketler yükleniyor" />
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="tag-catalog-state">
            Etiket bulunamadı.
          </div>
        ) : (
          <table className="tag-catalog-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("tag_name")}
                  className="sortable"
                >
                  Ad{" "}
                  {sortConfig.key === "tag_name"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </th>

                <th>Açıklama</th>

                <th
                  onClick={() => handleSort("slug")}
                  className="sortable"
                >
                  Slug{" "}
                  {sortConfig.key === "slug"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </th>

                {isAdmin && <th></th>}
              </tr>
            </thead>

            <tbody>
              {filteredTags.map((t) => (
                <tr key={t.id}>
                  <td>{t.tag_name}</td>

                  <td className="tag-catalog-description-cell">
                    {t.description || "-"}
                  </td>

                  <td>{t.slug}</td>

                  {isAdmin && (
                    <td>
                      <button
                        className="tag-catalog-edit-btn"
                        onClick={() => setEditTag(t)}
                        title="Düzenle"
                        aria-label="Düzenle"
                        type="button"
                      >
                        <Pencil size={16} strokeWidth={2} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODALS */}
      {addModalOpen && (
        <AddTagModal
          onClose={() => setAddModalOpen(false)}
          onSave={handleAddTag}
        />
      )}

      {editTag && (
        <EditTagModal
          tag={editTag}
          onClose={() => setEditTag(null)}
          onSave={handleEditSave}
          onDelete={handleDeleteTag}
        />
      )}
    </PageCard>
  );
}
