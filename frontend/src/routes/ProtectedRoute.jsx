// src/routes/ProtectedRoute.jsx
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function ProtectedRoute({
  children,
  staffOnly = false,
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user && staffOnly && !user.is_staff) {
      toast.error("Yetkisiz işlem 🚫");
    }
  }, [
    user,
    staffOnly,
    location.key, // 🔥 her navigation denemesinde tetiklenir
  ]);

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (staffOnly && !user.is_staff) {
    // ❗ URL değişmez, history bozulmaz
    return (
      <Navigate
        to={location.state?.from || "/customers"}
        replace
      />
    );
  }

  return children;
}
