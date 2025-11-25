import { createContext, useContext, useEffect, useState } from "react";
import { getCSRF, me } from "../services/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.location.pathname === "/login") {
      getCSRF().finally(() => setLoading(false));  // sadece csrf al
      return;
    }

    // Diğer tüm sayfalarda önce csrf al, sonra me() isteği yap
        me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
