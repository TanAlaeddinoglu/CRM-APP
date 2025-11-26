import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import ProfileDetails from "../components/ProfileDetails";
import EditProfileModal from "../components/EditProfileModal";
import AddUserModal from "../components/AddUserModal.jsx";
import { updateUser, createUser } from "../services/user";
import UserList from "../components/UserList.jsx";

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // EDIT PROFILE
  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = async (data) => {
    try {
      const res = await updateUser(user.id, data);

      setUser(res.data);
      setShowEditModal(false);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Something went wrong while updating profile.");
    }
  };

  // ADD USER (ADMIN ONLY)
  const handleAddUser = async (data) => {
    try {
      await createUser(data);
      setShowAddModal(false);
      alert("User created successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to create user.");
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: "20px" }}>
      <ProfileDetails
        user={user}
        onEdit={handleEdit}
        onAddUser={() => setShowAddModal(true)}
      />

      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
        />
      )}

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddUser}
        />
      )}

      {user.role === "ADMIN" && <UserList />}

    </div>
  );
}
