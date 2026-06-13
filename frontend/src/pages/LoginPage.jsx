import {useState, useEffect, useRef} from "react";
import {login, me, getCSRF} from "../services/auth";
import {useAuth} from "../context/AuthContext";
import {useNavigate} from "react-router-dom";
import "../assets/css/login.css";
import {toast} from "react-hot-toast";

export default function LoginPage() {
    const {setUser} = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [banUntil, setBanUntil] = useState(null);
    const [remaining, setRemaining] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitLockRef = useRef(false);

    const formatRemaining = (totalSeconds) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const extractWaitSeconds = (detail) => {
        if (typeof detail !== "string") {
            return null;
        }
        const match = detail.match(/(\d+)\s*second/);
        if (match) {
            return Number(match[1]);
        }
        return null;
    };

    useEffect(() => {
        getCSRF();
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem("loginBanUntil");
        if (stored) {
            const storedUntil = Number(stored);
            if (storedUntil > Date.now()) {
                setBanUntil(storedUntil);
            } else {
                localStorage.removeItem("loginBanUntil");
            }
        }
    }, []);

    useEffect(() => {
        if (!banUntil) {
            setRemaining(0);
            return;
        }

        const tick = () => {
            const diffSeconds = Math.max(0, Math.ceil((banUntil - Date.now()) / 1000));
            setRemaining(diffSeconds);
            if (diffSeconds === 0) {
                setBanUntil(null);
                localStorage.removeItem("loginBanUntil");
            }
        };

        tick();
        const intervalId = setInterval(tick, 1000);
        return () => clearInterval(intervalId);
    }, [banUntil]);

    useEffect(() => {
        if (remaining > 0) {
            setError(
                `Çok fazla deneme. Lütfen ${formatRemaining(remaining)} bekleyin.`
            );
        } else if (banUntil === null) {
            setError("");
        }
    }, [remaining, banUntil]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (banUntil && remaining > 0) {
            setError(
                `Çok fazla deneme. Lütfen ${formatRemaining(remaining)} bekleyin.`
            );
            return;
        }

        if (submitLockRef.current) {
            return;
        }

        try {
            submitLockRef.current = true;
            setIsSubmitting(true);
            await login({username, password});

            const response = await me();
            setUser(response.data);

            navigate("/customers");
        } catch (err) {
            const status = err?.response?.status || err?.status;
            const data = err?.response?.data || {};
            const detail =
                data.detail ||
                data?.errors?.[0]?.detail ||
                err?.message ||
                "Kullanıcı adı veya şifre hatalı.";

            const isThrottled =
                status === 429 || data?.errors?.[0]?.code === "throttled";

            if (isThrottled) {
                const retryAfter = Number(err?.response?.headers?.["retry-after"]);
                const parsedWait = extractWaitSeconds(detail);
                const waitSeconds = Number(
                    data.wait ||
                    data?.errors?.[0]?.wait ||
                    (Number.isFinite(retryAfter) ? retryAfter : parsedWait) ||
                    120
                );
                const until = Date.now() + waitSeconds * 1000;
                setBanUntil(until);
                localStorage.setItem("loginBanUntil", String(until));
                setError(
                    `Çok fazla deneme. Lütfen ${formatRemaining(waitSeconds)} bekleyin.`
                );
                return;
            }

            setError(detail);
            toast.error(detail);
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    };

    const isBanned = remaining > 0;
    const isDisabled = isBanned || isSubmitting;

    return (
        <div className="login-container">
            <div className="login-card">

                <h2 className="login-title">CRM Girişi</h2>
                <p className="login-subtitle">Lütfen bilgilerinizi girin</p>

                <form onSubmit={handleLogin} className="login-form">
                    <input
                        className="login-input"
                        placeholder="Kullanıcı Adı"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isDisabled}
                    />

                    <input
                        type="password"
                        className="login-input"
                        placeholder="Şifre"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isDisabled}
                    />

                    {error && (
                        <p className={isBanned ? "login-warning" : "login-error"}>
                            {error}
                        </p>
                    )}

                    <button type="submit" className="login-button" disabled={isDisabled}>
                        {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>
            </div>
        </div>
    );
}
