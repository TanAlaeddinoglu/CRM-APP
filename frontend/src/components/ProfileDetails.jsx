import "../assets/css/profileDetails.css";
import {isAdmin} from "../utils/roles";


export default function ProfileDetails({
                                           user, onEdit = () => {
    }, onAddUser = () => {
    }
                                       }) {
    const fields = [
        {label: "Email", value: user?.email},
        {label: "Username", value: user?.username},
        {label: "Name", value: user?.first_name},
        {label: "Surname", value: user?.last_name},
        {label: "Role", value: user?.role},
        {label: "Last Login", value: user?.last_login},
        {label: "User ID", value: user?.id},
    ];

    return (
        <div className="details-card">
            <h3 className="details-title">Profile Information</h3>
            {/* 🔥 Admin Yetkili Butonlar */}
            {isAdmin(user) && (
                <div className="details-actions">
                    <button className="details-btn edit" onClick={onEdit}>
                        Edit Profile
                    </button>
                    <button className="details-btn add" onClick={onAddUser}>
                        + Add User
                    </button>
                </div>
            )}

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
