import {useState} from "react";
import "../assets/css/editProfileModal.css";

export default function EditProfileModal({user, onClose, onSave}) {
    const [form, setForm] = useState({
        username: user.username || "",
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        is_active: user.is_active ?? true,
        role: user.role || "",
        password: "",

    });

    const handleChange = (e) => {
        const {name, value, type, checked} = e.target;

        setForm({
            ...form,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSend = {...form};
        if (!dataToSend.password) {
            delete dataToSend.password;
        }

        onSave(dataToSend);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box">

                <h2 className="modal-title">Edit Profile</h2>

                <form onSubmit={handleSubmit}>

                    <div className="modal-body">

                        <div className="modal-row">
                            <label>Username</label>
                            <input name="username" value={form.username} onChange={handleChange}/>
                        </div>

                        <div className="modal-row">
                            <label>Email</label>
                            <input name="email" value={form.email} onChange={handleChange}/>
                        </div>

                        <div className="modal-row">
                            <label>First Name</label>
                            <input name="first_name" value={form.first_name} onChange={handleChange}/>
                        </div>

                        <div className="modal-row">
                            <label>Last Name</label>
                            <input name="last_name" value={form.last_name} onChange={handleChange}/>
                        </div>

                        <div className="modal-row">
                            <label>Role</label>
                            <select name="role" value={form.role} onChange={handleChange}>
                                <option value="ADMIN">ADMIN</option>
                                <option value="USER">USER</option>
                            </select>
                        </div>
                        <div className="modal-row">
                            <label>New Password (optional)</label>
                            <input
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Leave empty to keep current password"
                            />
                        </div>
                        <div className="modal-row">
                            <label className="checkbox-row">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={form.is_active}
                                    onChange={handleChange}
                                />
                                <span>Active User</span>
                            </label>
                        </div>


                        <div className="modal-footer">
                            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                            <button type="submit" className="btn-primary">Save</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

    );
}
