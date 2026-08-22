import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState, useMemo } from "react";
import { api } from "../data/apiClient";
import { storage } from "../data/storage";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2, KeyRound, UserX, UserCheck, Eye, EyeOff, Lock } from "lucide-react";
import type { UserAccount, UserRole } from "../types";

export function UserManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [programs, setPrograms] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as UserRole,
    program: "BSIT",
    teacherId: "",
    status: "Active" as "Active" | "Suspended",
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
    api.get("/programs").then((res: any) => setPrograms(res.data?.data || [])).catch(() => setPrograms([]));
    api.get("/faculty").then((res: any) => setFaculty(res.data?.data || [])).catch(() => setFaculty([]));
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this user account from the institutional scheduling platform?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/users/${encodeURIComponent(id)}`);
      toast.push("User account removed", "success");
      fetchUsers();
    } catch (err: any) {
      toast.push(err?.message || "Failed to delete user", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    const nextStatus = user.status === "Active" ? "Suspended" : "Active";
    try {
      await api.put(`/users/${encodeURIComponent(user.id)}`, {
        ...user,
        status: nextStatus,
      });
      toast.push(`User status changed to ${nextStatus}`, "info");
      fetchUsers();
    } catch (err: any) {
      toast.push("Failed to update status", "error");
    }
  };

  const handleResetPassword = async (user: UserAccount) => {
    const newPass = window.prompt(`Enter new password for ${user.name} (${user.email}):`);
    if (!newPass || !newPass.trim()) return;
    try {
      await api.put(`/users/${encodeURIComponent(user.id)}`, {
        password: newPass.trim(),
      });
      toast.push(`Password updated in database for ${user.email}`, "success");
    } catch (err: any) {
      toast.push(err?.message || "Failed to reset password", "error");
    }
  };

  const handleEdit = (user: UserAccount) => {
    setEditingUser(user);
    setShowPassword(false);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      program: user.program || "BSIT",
      teacherId: user.teacherId || "",
      status: user.status || "Active",
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
        await api.put(`/users/${encodeURIComponent(editingUser.id)}`, {
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password ? form.password.trim() : undefined,
          program: form.role === "program_head" ? form.program : undefined,
          teacherId: form.role === "teacher" ? form.teacherId : undefined,
          status: form.status,
        });
        toast.push("User profile and password updated in database", "success");
      } else {
        await api.post("/users", {
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password ? form.password.trim() : undefined,
          program: form.role === "program_head" ? form.program : undefined,
          teacherId: form.role === "teacher" ? form.teacherId : undefined,
          status: form.status,
        });
        toast.push("User account saved to database with password", "success");
      }
      setIsOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.push(err?.message || "Failed to save user", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesQuery = [u.name, u.email, u.role, u.id, u.program || "", u.status]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <span className="pill pill--royal">Super Admin (ICT)</span>;
      case "admin":
        return <span className="pill pill--navy">Administrator</span>;
      case "program_head":
        return <span className="pill pill--emerald">Program Head</span>;
      case "teacher":
        return <span className="pill pill--slate">Teacher</span>;
      default:
        return <span className="pill">{role}</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="User Management & Access Control"
        description="ICT Office administration portal: Create, update, assign, and maintain institutional user accounts and roles."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <span>ICT Office</span> <span>/</span> <strong>Users</strong>
          </>
        }
        helpText="Manage role-based privileges for Administrators, Program Heads, and Faculty members with real-time permissions."
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
                program: "BSIT",
                teacherId: faculty[0]?.id || "",
                status: "Active",
              });
              setIsOpen(true);
            }}
          >
            <Plus size={16} />
            Create Account
          </button>
        }
      />

      <section className="card">
        <div className="card__header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">ICT Security & Roles</p>
            <h3>Registered Institutional Accounts ({filteredUsers.length})</h3>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Role:
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="program_head">Program Head</option>
                <option value="teacher">Teacher</option>
              </select>
            </label>
            <label className="topbar__search" aria-label="Search users">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, role..."
              />
            </label>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account ID</th>
                <th>Full Name</th>
                <th>Institutional Email</th>
                <th>Role & Scope</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: "right" }}>Management Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">No user accounts found matching your search.</div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <code style={{ fontSize: "0.8rem", fontWeight: 700 }}>{u.id}</code>
                    </td>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {getRoleBadge(u.role)}
                        {u.program && (
                          <span className="pill" style={{ fontSize: "0.75rem" }}>
                            {u.program}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className="pill"
                        style={{
                          backgroundColor: u.status === "Active" ? "#dcfce7" : "#fee2e2",
                          color: u.status === "Active" ? "#15803d" : "#b91c1c",
                        }}
                      >
                        {u.status || "Active"}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <button
                          type="button"
                          className="icon-button"
                          title="Reset Password"
                          onClick={() => handleResetPassword(u)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1" }}
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title={u.status === "Active" ? "Suspend Account" : "Activate Account"}
                          onClick={() => handleToggleStatus(u)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#f59e0b" }}
                        >
                          {u.status === "Active" ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit User Profile"
                          onClick={() => handleEdit(u)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Delete User"
                          onClick={() => handleDelete(u.id)}
                          disabled={deletingId === u.id}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
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

      {/* Create / Edit User Modal */}
      <Modal
        isOpen={isOpen}
        title={editingUser ? "Edit User Profile" : "Create Institutional Account"}
        description={
          editingUser
            ? "Update user permissions, role, and department assignment."
            : "Register a new user account with role-based access."
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
              placeholder="e.g. Dr. Alan Turing"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="userEmail">Institutional Email</label>
            <input
              id="userEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@srcb.edu.ph"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="userPassword">
              {editingUser ? "Change Password (Optional)" : "Account Password"}
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="userPassword"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingUser ? "Leave blank to keep existing" : "e.g. @srcb123"}
                style={{ width: "100%", paddingRight: 38 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  padding: 4,
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="userRole">Assigned System Role</label>
            <select
              id="userRole"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            >
              <option value="super_admin">⚡ Super Admin (ICT Office)</option>
              <option value="admin">🏛️ Administrator (Registrar)</option>
              <option value="program_head">🎓 Program Head</option>
              <option value="teacher">👨‍🏫 Faculty / Teacher</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="userStatus">Account Status</label>
            <select
              id="userStatus"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as "Active" | "Suspended" })}
            >
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {form.role === "program_head" && (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="userProgram">Assigned Program</label>
              <select
                id="userProgram"
                value={form.program}
                onChange={(e) => setForm({ ...form, program: e.target.value })}
              >
                {programs.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.role === "teacher" && (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="userTeacherId">Link Faculty Profile</label>
              <select
                id="userTeacherId"
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              >
                <option value="">Select linked faculty</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} - {f.name} ({f.department} · {f.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="table-actions" style={{ marginTop: 24 }}>
          <button type="button" className="secondary-button" onClick={() => setIsOpen(false)}>
            Cancel
          </button>
          <button type="button" className="action-button" disabled={loading} onClick={handleSave}>
            {loading ? "Saving…" : "Save Account"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
