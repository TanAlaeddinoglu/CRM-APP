import "../assets/css/profileDetails.css";
import {isAdmin} from "../utils/roles";
import { Pencil, UserPlus } from "lucide-react";

function formatLastLogin(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function ProfileDetails({
                                           user, onEdit = () => {
    }, onAddUser = () => {
    }
                                       }) {
    const fields = [
        {label: "E-posta", value: user?.email},
        {label: "Kullanıcı Adı", value: user?.username},
        {label: "Ad", value: user?.first_name},
        {label: "Soyad", value: user?.last_name},
        {label: "Rol", value: user?.role},
        {label: "Son Giriş", value: formatLastLogin(user?.last_login)},
    ];

    return (
        <div className="details-card">
            <div className="details-header">
                <h3 className="details-title">Profil Bilgileri</h3>
                {isAdmin(user) && (
                    <div className="details-actions">
                        <button
                            className="details-btn icon-only"
                            onClick={onEdit}
                            title="Profili Düzenle"
                            aria-label="Profili Düzenle"
                            type="button"
                        >
                            <Pencil size={18} strokeWidth={2} />
                        </button>
                        <button
                            className="details-btn icon-only"
                            onClick={onAddUser}
                            title="Kullanıcı Ekle"
                            aria-label="Kullanıcı Ekle"
                            type="button"
                        >
                            <UserPlus size={18} strokeWidth={2} />
                        </button>
                    </div>
                )}
            </div>

            <div className="details-list">
                {fields.map((item, i) => (
                    <div key={i} className="details-row">
                        <span className="details-label">{item.label}</span>
                        <span className="details-value">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
