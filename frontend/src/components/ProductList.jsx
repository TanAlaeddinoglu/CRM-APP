// src/components/ProductList.jsx
import {useEffect, useMemo, useState} from "react";
import "../assets/css/ProductList.css";
import {getProducts, createProduct, updateProduct} from "../services/product";
import {useAuth} from "../context/AuthContext";
import AddProductModal from "./AddProductModal.jsx";
import EditProductModal from "./EditProductModal.jsx";

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
            alert("Failed to create product.");
        }
    };

    const handleEditSave = async (data) => {
        try {
            await updateProduct(editProduct.id, data);
            await loadProducts();
            setEditProduct(null);
        } catch (err) {
            console.error("Update product error:", err);
            alert("Failed to update product.");
        }
    };

    return (
        <div className="product-list-container">
            <div className="product-list-header">
                <div>
                    <h2 className="product-list-title">Product Catalog</h2>
                    <p className="product-list-subtitle">
                        Manage products that can be assigned to customers.
                    </p>
                </div>

                <div className="product-list-actions">
                    <input
                        type="text"
                        className="product-search-input"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <label style={{display: "flex", alignItems: "center", gap: "6px"}}>
                        <input
                            type="checkbox"
                            checked={showOnlyWithDescription}
                            onChange={(e) => setShowOnlyWithDescription(e.target.checked)}
                        />
                        <span style={{fontSize: "13px"}}>Has description</span>
                    </label>

                    {isAdmin && (
                        <button
                            className="btn-primary"
                            onClick={() => setAddModalOpen(true)}
                        >
                            + Add Product
                        </button>
                    )}
                </div>
            </div>

            <div className="product-table-wrapper">
                {loading ? (
                    <div className="product-loading">Loading products...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="product-empty">No products found.</div>
                ) : (
                    <table className="product-table">
                        <thead>
                        <tr>
                            <th onClick={() => handleSort("name")} className="sortable">
                                Name {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                            </th>

                            <th>Description</th>

                            <th onClick={() => handleSort("slug")} className="sortable">
                                Slug {sortConfig.key === "slug" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                            </th>

                            <th onClick={() => handleSort("created_at")} className="sortable">
                                Created At {sortConfig.key === "created_at" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                            </th>

                            {isAdmin && <th>Edit</th>}
                        </tr>
                        </thead>

                        <tbody>
                        {filteredProducts.map((p) => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td className="product-description-cell">{p.description}</td>
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
