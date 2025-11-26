import { useEffect, useState } from "react";
import "../assets/css/UserList.css";
import {getUsers, updateUser} from "../services/user";
import EditProfileModal from "./EditProfileModal";
import { useAuth } from "../context/AuthContext";

export default function UserList() {
  const { user } = useAuth(); // role kontrolü
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);

  const loadUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error("User load error:", err);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadUsers();
    }
  }, [user?.role]);

const handleSave = async (updatedData) => {
  try {
    await updateUser(editUser.id, updatedData);
    await loadUsers();
    setEditUser(null);
  } catch (err) {
    console.error("User update error:", err);
  }
};

  if (user?.role !== "ADMIN") return null; // RBAC kontrolü

  return (
    <div className="user-list-container">
      <h2 className="list-title">Users</h2>

      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Name</th>
            <th>Surname</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Edit</th>
          </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.first_name}</td>
                <td>{u.last_name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <span className={`status ${u.is_active ? "active" : "inactive"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button
                    className="edit-btn"
                    onClick={() => setEditUser(u)}
                  >
                    ✏ Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editUser && (
        <EditProfileModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
