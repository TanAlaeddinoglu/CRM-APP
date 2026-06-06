// src/components/ProductList.jsx
import {useEffect, useMemo, useState} from "react";
import "../assets/css/ProductList.css";
import { Plus, Search } from "lucide-react";
import {getProducts, createProduct, updateProduct} from "../services/product";
import {useAuth} from "../context/AuthContext";
import AddProductModal from "./AddProductModal.jsx";
import EditProductModal from "./EditProductModal.jsx";
import ExportActionButton from "./export/ExportActionButton.jsx";

export default function ProductList() {
    const {user} = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");

    const [showOnlyWithDescription, setShowOnlyWithDescription] = useState(false);

    const [sortConfig, setSortConfig] = useState({
        key: null,    // "name" veya "created_at"
        direction: "asc" // asc | desc
    });

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editProduct, setEditProduct] = useState(null);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const res = await getProducts();
            setProducts(res.data);
        } catch (err) {
            console.error("Product load error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    // SIRALAMA FONKSİYONU
    const sortedProducts = useMemo(() => {
        let list = [...products];

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
    }, [products, sortConfig]);

    // FİLTRELEME + SEARCH
    const filteredProducts = useMemo(() => {
        let list = [...sortedProducts];

        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter((p) =>
                (p.name || "").toLowerCase().includes(term) ||
                (p.description || "").toLowerCase().includes(term)
            );
        }

        // Opsiyonel filtre
        if (showOnlyWithDescription) {
            list = list.filter((p) => p.description && p.description.trim() !== "");
        }

        return list;
    }, [sortedProducts, searchTerm, showOnlyWithDescription]);


    // Kolona tıklayınca sıralama
    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction:
                prev.key === key && prev.direction === "asc"
                    ? "desc"
                    : "asc",
        }));
    };

    const handleAddProduct = async (data) => {
        try {
            await createProduct(data);
            await loadProducts();
            setAddModalOpen(false);
        } catch (err) {
            console.error("Create product error:", err);
            alert("Ürün oluşturulamadı.");
        }
    };

    const handleEditSave = async (data) => {
        try {
            await updateProduct(editProduct.id, data);
            await loadProducts();
            setEditProduct(null);
        } catch (err) {
            console.error("Update product error:", err);
            alert("Ürün güncellenemedi.");
        }
    };

    return (
        <div className="product-list-container">
            <div className="product-list-header">
                <div className="product-list-heading">
                    <h2 className="product-list-title">Ürün Kataloğu</h2>
                    <span className="product-list-count">
                        {filteredProducts.length} ürün
                    </span>
                </div>

            </div>

            <div className="product-list-toolbar">
                <div className="product-search-field">
                    <Search size={18} />
                    <input
                        type="text"
                        className="product-search-input"
                        placeholder="Ürün ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <label className="product-list-checkbox">
                    <input
                        type="checkbox"
                        checked={showOnlyWithDescription}
                        onChange={(e) => setShowOnlyWithDescription(e.target.checked)}
                    />
                    <span>Açıklaması olanlar</span>
                </label>

                {isAdmin && (
                    <div className="product-list-export-action">
                        <ExportActionButton
                            model="product"
                            initialRecipientEmail={user?.email || ""}
                            buttonClassName="btn-secondary"
                            buttonLabel="Dışa Aktar"
                        />
                    </div>
                )}

                {isAdmin && (
                    <button
                        className="btn-primary product-list-add-btn"
                        onClick={() => setAddModalOpen(true)}
                    >
                        <Plus size={16} />
                        Ürün Ekle
                    </button>
                )}
            </div>

            <div className="product-table-wrapper">
                {loading ? (
                    <div className="product-loading">Ürünler yükleniyor...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="product-empty">Ürün bulunamadı.</div>
                ) : (
                    <table className="product-table">
                        <thead>
                        <tr>
                            <th onClick={() => handleSort("name")} className="sortable">
                                Ad {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                            </th>

                            <th>Açıklama</th>

                            <th onClick={() => handleSort("slug")} className="sortable">
                                Slug {sortConfig.key === "slug" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                            </th>

                            <th onClick={() => handleSort("created_at")} className="sortable">
                                Oluşturulma {sortConfig.key === "created_at" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                            </th>

                            {isAdmin && <th>Düzenle</th>}
                        </tr>
                        </thead>

                        <tbody>
                        {filteredProducts.map((p) => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td className="product-description-cell">{p.description || "-"}</td>
                                <td>{p.slug}</td>
                                <td>
                                    {p.created_at
                                        ? new Date(p.created_at).toLocaleString()
                                        : "-"}
                                </td>

                                {isAdmin && (
                                    <td>
                                        <button
                                            className="product-edit-btn"
                                            onClick={() => setEditProduct(p)}
                                        >
                                            Düzenle
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {addModalOpen && (
                <AddProductModal
                    onClose={() => setAddModalOpen(false)}
                    onSave={handleAddProduct}
                />
            )}

            {editProduct && (
                <EditProductModal
                    product={editProduct}
                    onClose={() => setEditProduct(null)}
                    onSave={handleEditSave}
                />
            )}
        </div>
    );
}
