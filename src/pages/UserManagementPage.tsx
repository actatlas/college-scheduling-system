import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export function UserManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
  });

  const toast = useToast();

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data?.data || []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this account from the institution portal?"))
      return;
    setDeletingId(id);
    try {
      await api.delete(`/users/${id}`);
      toast.push("User deleted successfully", "success");
      fetchUsers();
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to delete user",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (user: UserRow) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "", // do not populate password
      role: user.role,
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.push("Name and Email are required", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          name: form.name,
          email: form.email,
          role: form.role,
        });
        toast.push("User updated successfully", "success");
      } else {
        if (!form.password) {
          toast.push("Password is required for new users", "error");
          setLoading(false);
          return;
        }
        await api.post("/auth/register", form);
        toast.push("User created successfully", "success");
      }
      setIsOpen(false);
      setEditingUser(null);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "admin",
      });
      fetchUsers();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to save user", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    [u.name, u.email, u.role, u.id]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="User Management"
        description="Oversee administrator access and institution-wide roles for the scheduling platform."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Users</strong>
          </>
        }
        helpText="Create and manage access carefully so the right people can work with the right records."
        actions={
          <button
            className="action-button"
            type="button"
            onClick={() => {
              setEditingUser(null);
              setForm({
                name: "",
                email: "",
                password: "",
                role: "admin",
              });
              setIsOpen(true);
            }}
          >
            <Plus size={16} />
            Create User
          </button>
        }
      />

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Access control</p>
            <h3>Secure administration roles</h3>
          </div>
          <label className="topbar__search" aria-label="Search users">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users"
            />
          </label>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      No users matched your search.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className={`pill ${u.role === "admin" ? "pill--royal" : u.role === "teacher" ? "pill--navy" : "pill--slate"}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit User"
                          onClick={() => handleEdit(u)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#4b5563",
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Delete User"
                          onClick={() => handleDelete(u.id)}
                          disabled={deletingId === u.id}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: deletingId === u.id ? "wait" : "pointer",
                            color: "#dc2626",
                            opacity: deletingId === u.id ? 0.7 : 1,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={isOpen}
        title={editingUser ? "Edit User Profile" : "Create New User"}
        description={
          editingUser
            ? "Modify access permissions and email address."
            : "Add a new user to the scheduling platform."
        }
        onClose={() => setIsOpen(false)}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="userName">Full Name</label>
            <input
              id="userName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Juan Dela Cruz"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="userEmail">Email Address</label>
            <input
              id="userEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@srcb.edu.ph"
              required
            />
          </div>

          {!editingUser && (
            <div className="field-group">
              <label htmlFor="userPass">Password</label>
              <input
                id="userPass"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 6 characters"
                required
              />
            </div>
          )}

          <div className="field-group">
            <label htmlFor="userRole">System Role</label>
            <select
              id="userRole"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="admin">Administrator</option>
              <option value="program_head">Program Head</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
        </div>

        <div className="table-actions" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? "Saving…" : "Save User"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
