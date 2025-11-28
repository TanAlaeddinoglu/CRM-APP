import { useState, useEffect } from "react";
import { login, me, getCSRF } from "../services/auth";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../assets/css/login.css";
import {toast} from "react-hot-toast";

export default function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getCSRF();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login({ username, password });

      const response = await me();
      setUser(response.data);

      navigate("/");
    } catch (err) {
      //setError("Incorrect username or password.");
      toast.error("Incorrect username or password.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">

        <h2 className="login-title">CRM Login</h2>
        <p className="login-subtitle">Please enter your credentials</p>

        <form onSubmit={handleLogin} className="login-form">
          <input
            className="login-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
