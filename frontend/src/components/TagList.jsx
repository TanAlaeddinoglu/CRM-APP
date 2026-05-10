// src/components/TagList.jsx
import { useEffect, useMemo, useState } from "react";
import "../assets/css/ProductList.css";
import { useAuth } from "../context/AuthContext";
import { getTags, createTag, updateTag, deleteTag } from "../services/tag";
import { toast } from "react-hot-toast";
import ExportActionButton from "./export/ExportActionButton.jsx";

import AddTagModal from "./AddTagModal";
import EditTagModal from "./EditTagModal";

export default function TagList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

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
      toast.error("Tagler yüklenirken bir hata oluştu.");
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
      toast.success("Tag başarıyla oluşturuldu.");
    } catch (err) {
      console.error("Create tag error:", err);
      toast.error("Tag oluşturulamadı.");
    }
  };

  const handleEditSave = async (data) => {
    try {
      await updateTag(editTag.id, data);
      await loadTags();
      setEditTag(null);
      toast.success("Tag güncellendi.");
    } catch (err) {
      console.error("Update tag error:", err);
      toast.error("Tag güncellenemedi.");
    }
  };

  const handleDeleteTag = async (id) => {
    try {
      await deleteTag(id);
      toast.success("Tag silindi.");
      setEditTag(null);
      await loadTags();
    } catch (err) {
      console.error("Delete tag error:", err);
      toast.error("Tag silinemedi.");
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="product-list-container">
      {/* HEADER */}
      <div className="product-list-header">
        <div>
          <h2 className="product-list-title">Tag Catalog</h2>
          <p className="product-list-subtitle">
            Manage customer tags.
          </p>
        </div>

        <div className="product-list-actions">
          <input
            type="text"
            className="product-search-input"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <input
              type="checkbox"
              checked={showOnlyWithDescription}
              onChange={(e) =>
                setShowOnlyWithDescription(e.target.checked)
              }
            />
            <span style={{ fontSize: "13px" }}>
              Has description
            </span>
          </label>

          {isAdmin && (
            <ExportActionButton
              model="tag"
              initialRecipientEmail={user?.email || ""}
              buttonClassName="btn-secondary"
              buttonLabel="Export"
            />
          )}

          {isAdmin && (
            <button
              className="btn-primary"
              onClick={() => setAddModalOpen(true)}
            >
              + Add Tag
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="product-table-wrapper">
        {loading ? (
          <div className="product-loading">
            Loading tags...
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="product-empty">
            No tags found.
          </div>
        ) : (
          <table className="product-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("tag_name")}
                  className="sortable"
                >
                  Name{" "}
                  {sortConfig.key === "tag_name"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </th>

                <th>Description</th>

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

                {isAdmin && <th>Edit</th>}
              </tr>
            </thead>

            <tbody>
              {filteredTags.map((t) => (
                <tr key={t.id}>
                  <td>{t.tag_name}</td>

                  <td className="product-description-cell">
                    {t.description}
                  </td>

                  <td>{t.slug}</td>

                  {isAdmin && (
                    <td>
                      <button
                        className="product-edit-btn"
                        onClick={() => setEditTag(t)}
                      >
                        Edit
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
    </div>
  );
}
