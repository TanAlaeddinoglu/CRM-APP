import { useState } from "react";
import EditProfileModal from "../components/EditProfileModal";
import { updateUser } from "../services/user";

export default function UserListPage() {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleSave = async (formData) => {
    try {
      const res = await updateUser(selectedUser.id, formData);
      alert("User updated!");

      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      alert("Update failed!");
    }
  };

  return (
    <>
      {/* user list burada olacak */}

      {selectedUser && (
        <EditProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
