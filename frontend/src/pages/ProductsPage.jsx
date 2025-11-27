// src/pages/ProductsPage.jsx
import ProductList from "../components/ProductList";

export default function ProductsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "16px" }}>
        Products
      </h1>
      <ProductList />
    </div>
  );
}
