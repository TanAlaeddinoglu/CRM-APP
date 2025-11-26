import { useState } from "react";
import "../assets/css/editProfileModal.css";

export default function AddUserModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    role: "USER",
    is_active: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form); // backend createUser()
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">

        <h2 className="modal-title">Add New User</h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            <div className="modal-row">
              <label>Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="modal-row">
              <label>Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
              />
            </div>

            <div className="modal-row">
              <label>First Name</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
              />
            </div>

            <div className="modal-row">
              <label>Last Name</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
              />
            </div>

            <div className="modal-row">
              <label>Password</label>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type="password"
                required
              />
            </div>

            <div className="modal-row">
              <label>Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="USER">USER</option>
              </select>
            </div>

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
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
