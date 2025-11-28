import { useEffect, useState, useMemo } from "react";
import "../assets/css/UserList.css";
import {getUsers, updateUser} from "../services/user";
import EditProfileModal from "./EditProfileModal";
import { useAuth } from "../context/AuthContext";
import {toast} from "react-hot-toast";

export default function UserList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // sorting
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc"); // toggles asc/desc

  const loadUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error("User load error:", err);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  if (!isAdmin) return null;

  // 🔍 SEARCH + FILTER
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const target =
          `${u.username} ${u.first_name} ${u.last_name} ${u.email}`.toLowerCase();
        if (!target.includes(searchTerm.toLowerCase())) return false;

        if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

        if (statusFilter === "ACTIVE" && !u.is_active) return false;
        if (statusFilter === "INACTIVE" && u.is_active) return false;

        return true;
      })
      .sort((a, b) => {
        if (!sortField) return 0;

        let valA = a[sortField];
        let valB = b[sortField];

        // Boolean sort
        if (sortField === "is_active") {
          valA = valA ? 1 : 0;
          valB = valB ? 1 : 0;
        }

        // String lowercase sort
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [users, searchTerm, roleFilter, statusFilter, sortField, sortOrder]);

  // 🔽 sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // save user
  const handleSave = async (data) => {
    try {
      await updateUser(editUser.id, data);  // PATCH isteği at
      await loadUsers();                    // Listeyi yenile
      setEditUser(null);                    // Modal kapanır
    } catch (err) {
      console.error("Update user error:", err);
      toast.loading("Failed to update user.");
    }
  };

  return (
    <div className="user-list-container">

      {/* FILTER AREA */}
      <div className="user-filters">
        <input
          type="text"
          placeholder="Search users..."
          className="user-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="user-filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>

        <select
          className="user-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* USER TABLE */}
      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("id")}>ID</th>
              <th onClick={() => handleSort("username")}>Username</th>
              <th onClick={() => handleSort("first_name")}>Name</th>
              <th onClick={() => handleSort("last_name")}>Surname</th>
              <th onClick={() => handleSort("email")}>Email</th>
              <th onClick={() => handleSort("role")}>Role</th>
              <th onClick={() => handleSort("is_active")}>Status</th>
              <th>Edit</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => (
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
                  <button className="edit-btn" onClick={() => setEditUser(u)}>
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
