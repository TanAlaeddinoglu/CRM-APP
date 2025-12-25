import {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {
    getCustomers,
    getMyCustomers,
} from "../services/customer";

const DEBOUNCE_MS = 300;

export default function HeaderCustomerSearch({role}) {
    const navigate = useNavigate();
    const wrapperRef = useRef(null);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    /* ================= CLICK OUTSIDE ================= */
    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /* ================= DEBOUNCE (3 HARF) ================= */
    useEffect(() => {
        const trimmed = query.trim();

        if (trimmed.length < 3) {
            setResults([]);
            setOpen(false);
            setLoading(false);
            setSearched(false);
            return;
        }

        const timer = setTimeout(() => {
            fetchCustomers(trimmed);
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [query]);

    /* ================= API ================= */
    async function fetchCustomers(search) {
        try {
            setLoading(true);
            setSearched(true);

            const isAdmin =
                role === "admin" ||
                role === "ADMIN" ||
                role === "staff";

            const response = isAdmin
                ? await getCustomers({search, page_size: 30})
                : await getMyCustomers({search, page_size: 30});

            setResults(response.data.results || []);
            setOpen(true);
            setHighlighted(-1);
        } catch (err) {
            console.error("Customer search error:", err.response?.status);
            console.error("Customer search error data:", err.response?.data);
        } finally {
            setLoading(false);
        }
    }

    /* ================= KEYBOARD ================= */
    function handleKeyDown(e) {
        if (!open) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((prev) =>
                prev < results.length - 1 ? prev + 1 : prev
            );
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((prev) => (prev > 0 ? prev - 1 : -1));
        }

        if (e.key === "Enter" && highlighted >= 0) {
            goToDetail(results[highlighted].id);
        }

        if (e.key === "Escape") {
            setOpen(false);
        }
    }

    /* ================= NAVIGATION ================= */
    function goToDetail(id) {
        setOpen(false);
        setQuery("");
        navigate(`/customers/${id}`);
    }

    /* ================= HIGHLIGHT ================= */
    function highlight(text, keyword) {
        if (!keyword) return text;

        const regex = new RegExp(`(${keyword})`, "ig");
        return text.split(regex).map((part, i) =>
            part.toLowerCase() === keyword.toLowerCase() ? (
                <strong key={i}>{part}</strong>
            ) : (
                part
            )
        );
    }

    /* ================= RENDER ================= */
    return (
        <div className="header-search" ref={wrapperRef}>
            <input
                className="search-input"
                placeholder="Müşteri ara..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
            />

            {open && (
                <ul className="search-dropdown">

                    {/* ⏳ LOADING */}
                    {loading && (
                        <li className="search-state">Aranıyor…</li>
                    )}

                    {/* ❌ EMPTY */}
                    {!loading && searched && results.length === 0 && (
                        <li className="search-state">Sonuç bulunamadı</li>
                    )}

                    {/* ✅ RESULTS */}
                    {!loading &&
                        results.map((c, index) => (
                            <li
                                key={c.id}
                                className={index === highlighted ? "active" : ""}
                                onMouseEnter={() => setHighlighted(index)}
                                onMouseDown={() => goToDetail(c.id)}
                            >
                                <div className="search-row">
                                    <div className="search-main">
                                        <div className="name-row">
                                            <div className="name">
                                                {highlight(`${c.customer_name} ${c.customer_surname}`, query)}
                                            </div>

                                            <span className="tag-badge">{c.tag || "Pool"}</span>
                                        </div>

                                        <div className="meta">
                                            {highlight(c.customer_email, query)} ·{" "}
                                            {highlight(c.customer_phone, query)}
                                        </div>
                                    </div>

                                </div>
                            </li>
                        ))}

                </ul>
            )}
        </div>
    );
}
