import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { TableSkeleton } from "../components/common/Skeleton";
import { useNotifications } from "../contexts/NotificationContext";
import {
  UserCheck,
  UserX,
  Plus,
  Search,
  Edit2,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Filter,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileSpreadsheet,
  FileCode,
  Printer,
  Sparkles,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { formatSystemId } from "../utils/idFormatter";
import type { UserAccount, UserRole, ProgramItem, FacultyMember } from "../types";

export function UserManagementPage() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Modals & Active Selections
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<UserAccount | null>(null);
  const [userToActivate, setUserToActivate] = useState<UserAccount | null>(null);
  const [bulkActionType, setBulkActionType] = useState<"suspend" | "activate" | null>(null);

  const [viewingUser, setViewingUser] = useState<UserAccount | null>(null);
  const [resettingUser, setResettingUser] = useState<UserAccount | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resettingLoading, setResettingLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Search & Filters State
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [programFilter, setProgramFilter] = useState<string>("all");

  useEffect(() => {
    const s = searchParams.get("status");
    if (s) {
      setStatusFilter(s);
    }
  }, [searchParams]);
  
  // Dropdown Popovers
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [openRowActionId, setOpenRowActionId] = useState<string | null>(null);

  // Row Selection (Checkboxes)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Refs for click outside
  const filterRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Form Validation States
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [middleNameError, setMiddleNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const activeRole = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const currentUserName = localStorage.getItem("userName") || "";
  const isSuperAdmin = activeRole === "super_admin";

  const { addNotification } = useNotifications();
  const toast = useToast();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "teacher" as UserRole,
    status: "Active" as "Active" | "Suspended",
    program: "BSIT",
    teacherId: "",
  });

  // Handle outside clicks for popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(target)) {
        setIsExportOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setOpenRowActionId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data?.data || []);
    } catch {
      setUsers([]);
    } finally {
      setFetching(false);
    }
  };

  const fetchProgramsAndFaculty = async () => {
    try {
      const [progRes, facRes] = await Promise.all([
        api.get("/programs").catch(() => ({ data: { data: [] } })),
        api.get("/faculty").catch(() => ({ data: { data: [] } })),
      ]);
      setPrograms(progRes.data?.data || []);
      setFaculty(facRes.data?.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
      fetchProgramsAndFaculty();
    }
  }, [isSuperAdmin]);

  // Filtered Users Calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const formattedId = formatSystemId(u.id);
      const matchesQuery = !query.trim() || [
        u.name,
        u.email,
        u.role,
        u.id,
        formattedId,
        u.program || "",
        u.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase());

      const matchesRole =
        roleFilter === "all" || u.role.toLowerCase() === roleFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" || u.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesProgram =
        programFilter === "all" ||
        (u.program && u.program.toLowerCase() === programFilter.toLowerCase());

      return matchesQuery && matchesRole && matchesStatus && matchesProgram;
    });
  }, [users, query, roleFilter, statusFilter, programFilter]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, roleFilter, statusFilter, programFilter, pageSize]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Active filter count
  const activeFilterCount =
    (roleFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (programFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setProgramFilter("all");
    setIsFilterOpen(false);
  };

  // Row Selection Handlers
  const isAllCurrentPageSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((u) => selectedIds.has(u.id));

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const next = new Set(selectedIds);
      paginatedUsers.forEach((u) => next.delete(u.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginatedUsers.forEach((u) => next.add(u.id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Check if a user is the currently logged in super admin
  const isSelfUser = (u: UserAccount) => {
    return (
      (u.role === "super_admin" && currentUserName && u.name.toLowerCase() === currentUserName.toLowerCase()) ||
      u.email.toLowerCase() === "superadmin@srcb.edu.ph"
    );
  };

  const selectedUsers = useMemo(() => {
    return users.filter((u) => selectedIds.has(u.id));
  }, [users, selectedIds]);

  const selectedSuspendedCount = useMemo(() => {
    return selectedUsers.filter(
      (u) => String(u.status || "").trim().toLowerCase() === "suspended"
    ).length;
  }, [selectedUsers]);

  const selectedActiveCount = useMemo(() => {
    return selectedUsers.filter(
      (u) =>
        String(u.status || "").trim().toLowerCase() !== "suspended" &&
        !isSelfUser(u)
    ).length;
  }, [selectedUsers, currentUserName]);

  const totalSuspendedCount = useMemo(() => {
    return users.filter(
      (u) => String(u.status || "").trim().toLowerCase() === "suspended"
    ).length;
  }, [users]);

  // Execute Account Suspension
  const executeSuspend = async () => {
    if (!userToSuspend) return;
    if (isSelfUser(userToSuspend)) {
      toast.push("You cannot suspend your own account.", "error");
      setUserToSuspend(null);
      return;
    }
    const isAlreadySuspended = String(userToSuspend.status || "").trim().toLowerCase() === "suspended";
    if (isAlreadySuspended) {
      toast.push(`Account for ${userToSuspend.name} is already suspended.`, "info");
      setUserToSuspend(null);
      return;
    }
    setLoading(true);
    try {
      await api.put(`/users/${encodeURIComponent(userToSuspend.id)}`, {
        ...userToSuspend,
        status: "Suspended",
      });
      toast.push(`Account for ${userToSuspend.name} suspended successfully.`, "success");
      addNotification({
        title: "Account Suspended",
        message: `Account for ${userToSuspend.name} (${userToSuspend.email}) was suspended. Existing schedules and records remain intact.`,
        type: "warning",
        link: "/users",
      });
      setUserToSuspend(null);
      fetchUsers();
    } catch (err: any) {
      toast.push(err?.message || "Failed to suspend account", "error");
    } finally {
      setLoading(false);
    }
  };

  // Execute Account Activation / Unsuspension
  const executeActivate = async () => {
    if (!userToActivate) return;
    const isCurrentlySuspended = String(userToActivate.status || "").trim().toLowerCase() === "suspended";
    if (!isCurrentlySuspended) {
      toast.push(`Account for ${userToActivate.name} is already active.`, "info");
      setUserToActivate(null);
      return;
    }
    setLoading(true);
    try {
      await api.put(`/users/${encodeURIComponent(userToActivate.id)}`, {
        ...userToActivate,
        status: "Active",
      });
      toast.push(`Account for ${userToActivate.name} unsuspended & reactivated successfully.`, "success");
      addNotification({
        title: "Account Reactivated",
        message: `Account for ${userToActivate.name} (${userToActivate.email}) was unsuspended. Login access is restored.`,
        type: "success",
        link: "/users",
      });
      setUserToActivate(null);
      fetchUsers();
    } catch (err: any) {
      toast.push(err?.message || "Failed to activate account", "error");
    } finally {
      setLoading(false);
    }
  };

  // Execute Bulk Status Change
  const executeBulkStatusChange = async () => {
    if (!bulkActionType || selectedIds.size === 0) return;
    const targetStatus = bulkActionType === "suspend" ? "Suspended" : "Active";

    // Strict filter:
    // When activating: ONLY select accounts that are currently Suspended
    // When suspending: ONLY select accounts that are currently Active (and not self)
    const validTargets =
      targetStatus === "Suspended"
        ? selectedUsers.filter(
            (u) =>
              String(u.status || "").trim().toLowerCase() !== "suspended" &&
              !isSelfUser(u)
          )
        : selectedUsers.filter(
            (u) =>
              String(u.status || "").trim().toLowerCase() === "suspended"
          );

    if (validTargets.length === 0) {
      const msg =
        targetStatus === "Active"
          ? "No suspended accounts were selected to unsuspend."
          : "No active eligible accounts were selected to suspend.";
      toast.push(msg, "info");
      setBulkActionType(null);
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        validTargets.map((u) =>
          api.put(`/users/${encodeURIComponent(u.id)}`, {
            ...u,
            status: targetStatus,
          })
        )
      );
      const actionText = targetStatus === "Suspended" ? "suspended" : "unsuspended & reactivated";
      toast.push(`Successfully ${actionText} ${validTargets.length} account(s).`, "success");
      addNotification({
        title: `Bulk Accounts ${targetStatus === "Suspended" ? "Suspended" : "Reactivated"}`,
        message: `${validTargets.length} user accounts were set to ${targetStatus}.`,
        type: targetStatus === "Active" ? "success" : "warning",
        link: "/users",
      });
      clearSelection();
      setBulkActionType(null);
      fetchUsers();
    } catch (err: any) {
      toast.push(err?.message || `Failed to update selected accounts`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Export handlers
  const exportToCsv = (data: UserAccount[], filename = "scsms_registered_accounts.csv") => {
    const headers = ["System ID", "Formatted ID", "Full Name", "School Email", "Role", "Program", "Status", "Joined Date"];
    const rows = data.map((u) => [
      `"${u.id}"`,
      `"${formatSystemId(u.id)}"`,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${u.email || ""}"`,
      `"${u.role || ""}"`,
      `"${u.program || ""}"`,
      `"${u.status || "Active"}"`,
      `"${u.createdAt || ""}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.push(`Exported ${data.length} accounts to CSV`, "info");
    setIsExportOpen(false);
  };

  const exportToJson = (data: UserAccount[], filename = "scsms_registered_accounts.json") => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.push(`Exported ${data.length} accounts to JSON`, "info");
    setIsExportOpen(false);
  };

  const handlePrint = () => {
    setIsExportOpen(false);
    window.print();
  };

  // Helper formatting functions
  const formatJoinedDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin (ICT)";
      case "admin":
        return "Administrator";
      case "program_head":
        return "Program Head";
      case "teacher":
        return "Teacher / Faculty";
      default:
        return role;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <span className="pill pill--royal">Super Admin</span>;
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

  if (!isSuperAdmin) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center", marginTop: 20 }}>
        <h3 style={{ color: "var(--srcb-navy)", marginBottom: 8 }}>Access Restricted</h3>
        <p style={{ color: "var(--srcb-text-muted)", fontSize: "0.9rem" }}>
          User Account Governance is exclusively reserved for the Super Administrator (ICT Office).
          Regular Administrators manage academic catalog records, faculty assignments, rooms, and
          timetables.
        </p>
      </div>
    );
  }

  // Delete execution
  const executeDelete = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/users/${encodeURIComponent(userToDelete.id)}`);
      toast.push("User account removed successfully", "success");
      addNotification({
        title: "User Account Removed",
        message: `Account for ${userToDelete.name} (${userToDelete.email}) was removed from the system.`,
        type: "warning",
        link: "/users",
      });
      selectedIds.delete(userToDelete.id);
      setSelectedIds(new Set(selectedIds));
      fetchUsers();
    } catch (err: any) {
      toast.push(err?.message || "Failed to delete user", "error");
    } finally {
      setLoading(false);
      setUserToDelete(null);
    }
  };

  // Dedicated Password Reset
  const handleOpenResetPassword = (user: UserAccount) => {
    setResettingUser(user);
    setResetPasswordVal("@srcb" + Math.floor(100 + Math.random() * 900));
    setShowResetPassword(false);
    setOpenRowActionId(null);
  };

  const handleSaveResetPassword = async () => {
    if (!resettingUser || !resetPasswordVal.trim()) return;
    setResettingLoading(true);
    try {
      await api.put(`/users/${encodeURIComponent(resettingUser.id)}`, {
        password: resetPasswordVal.trim(),
      });
      toast.push(`Password updated successfully for ${resettingUser.email}`, "success");
      addNotification({
        title: "Password Reset Completed",
        message: `Password reset successfully for ${resettingUser.name} (${resettingUser.email}).`,
        type: "info",
        link: "/users",
      });
      setResettingUser(null);
      setResetPasswordVal("");
    } catch (err: any) {
      toast.push(err?.message || "Failed to reset password", "error");
    } finally {
      setResettingLoading(false);
    }
  };

  // Add / Edit Modal Openers
  const handleOpenAdd = () => {
    setEditingUser(null);
    setShowPassword(false);
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setPhone("");
    setFirstNameError(null);
    setMiddleNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setForm({
      email: "",
      password: "@srcb123",
      role: "teacher",
      program: "BSIT",
      teacherId: "",
      status: "Active",
    });
    setIsOpen(true);
  };

  const handleEdit = (user: UserAccount) => {
    setEditingUser(user);
    setShowPassword(false);
    const parts = (user.name || "").trim().split(" ");
    const fName = parts[0] || "";
    const mName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
    const lName = parts.length > 1 ? parts[parts.length - 1] : "";
    setFirstName(fName);
    setMiddleName(mName);
    setLastName(lName);
    setPhone("");
    setFirstNameError(null);
    setMiddleNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setForm({
      email: user.email,
      password: "",
      role: user.role,
      program: user.program || "BSIT",
      teacherId: user.teacherId || "",
      status: user.status || "Active",
    });
    setOpenRowActionId(null);
    setIsOpen(true);
  };

  const handleView = (user: UserAccount) => {
    setViewingUser(user);
    setOpenRowActionId(null);
  };

  // Form Field Validation Handlers
  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (val && !/^[A-Za-z\s.\-']*$/.test(val)) {
      setFirstNameError("Invalid. Please enter characters only.");
    } else {
      setFirstNameError(null);
    }
  };

  const handleMiddleNameChange = (val: string) => {
    setMiddleName(val);
    if (val && !/^[A-Za-z\s.\-']*$/.test(val)) {
      setMiddleNameError("Invalid. Please enter characters only.");
    } else {
      setMiddleNameError(null);
    }
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (val && !/^[A-Za-z\s.\-']*$/.test(val)) {
      setLastNameError("Invalid. Please enter characters only.");
    } else {
      setLastNameError(null);
    }
  };

  const handlePhoneChange = (val: string) => {
    const filtered = val.replace(/[^0-9+\s\-()]/g, "");
    setPhone(filtered);
    if (val !== filtered) {
      setPhoneError("Invalid phone number. Please enter digits only.");
    } else {
      setPhoneError(null);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      setFirstNameError("First Name is required");
      toast.push("First Name is required", "error");
      return;
    }
    if (!/^[A-Za-z\s.\-']+$/.test(firstName.trim())) {
      setFirstNameError("Invalid. Please enter characters only.");
      toast.push("Invalid First Name. Please enter characters only.", "error");
      return;
    }

    if (middleName.trim() && !/^[A-Za-z\s.\-']+$/.test(middleName.trim())) {
      setMiddleNameError("Invalid. Please enter characters only.");
      toast.push("Invalid Middle Name. Please enter characters only.", "error");
      return;
    }

    if (!lastName.trim()) {
      setLastNameError("Last Name is required");
      toast.push("Last Name is required", "error");
      return;
    }
    if (!/^[A-Za-z\s.\-']+$/.test(lastName.trim())) {
      setLastNameError("Invalid. Please enter characters only.");
      toast.push("Invalid Last Name. Please enter characters only.", "error");
      return;
    }

    if (!form.email || !form.email.includes("@")) {
      toast.push("A valid institutional email is required", "error");
      return;
    }

    if (phone.trim() && !/^\+?[0-9\s\-()]{7,15}$/.test(phone.trim())) {
      setPhoneError("Invalid phone number. Please enter 7–15 digits.");
      toast.push("Invalid phone number format", "error");
      return;
    }

    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");

    setLoading(true);
    try {
      if (editingUser) {
        await api.put(`/users/${encodeURIComponent(editingUser.id)}`, {
          name: fullName,
          email: form.email,
          role: form.role,
          password: form.password ? form.password.trim() : undefined,
          program: form.role === "program_head" ? form.program : undefined,
          teacherId: form.role === "teacher" || form.role === "program_head" ? form.teacherId : undefined,
          status: form.status,
        });
        toast.push("User profile and permissions updated successfully", "success");
        addNotification({
          title: "User Account Updated",
          message: `${fullName} (${form.role}) profile updated.`,
          type: "success",
          link: "/users",
        });
      } else {
        await api.post("/users", {
          name: fullName,
          email: form.email,
          role: form.role,
          password: form.password ? form.password.trim() : "@srcb123",
          program: form.role === "program_head" ? form.program : undefined,
          teacherId: form.role === "teacher" || form.role === "program_head" ? form.teacherId : undefined,
          status: form.status,
        });
        toast.push(`Account registered for ${fullName} with initial password`, "success");
        addNotification({
          title: "New Account Registered",
          message: `${fullName} (${form.email}) was registered as ${form.role}.`,
          type: "success",
          link: "/users",
        });
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

  return (
    <motion.div
      className="user-mgmt-container"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="User Account Management"
        description="Provision institutional users, assign system roles, configure departmental permissions, and manage account statuses."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <span>ICT Governance</span> <span>/</span> <strong>Users</strong>
          </>
        }
        actions={
          <button
            className="user-mgmt-primary-btn"
            type="button"
            onClick={handleOpenAdd}
            aria-label="Add new user account"
          >
            <Plus size={16} />
            <span>Add User</span>
          </button>
        }
      />
            {/* ICT Governance Board Warning Alert (if any accounts are suspended) */}
      {totalSuspendedCount > 0 && (
        <motion.div
          className="ict-suspended-board-alert"
          role="alert"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                padding: "8px",
                borderRadius: "8px",
                background: "rgba(220, 38, 38, 0.12)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserX size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: "0.95rem", color: "#991b1b" }}>
                  ⚠️ ICT Governance Board Notice: {totalSuspendedCount} Account{totalSuspendedCount === 1 ? "" : "s"} Suspended
                </strong>
                <span className="pill pill--amber" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                  Login Blocked
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#78350f" }}>
                {totalSuspendedCount === 1 ? "1 user is" : `${totalSuspendedCount} users are`} temporarily blocked from signing in. All existing academic loads, timetables, and records remain preserved.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {statusFilter !== "Suspended" && (
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: "0.8rem", padding: "6px 12px", background: "#ffffff", color: "#b91c1c", borderColor: "#fca5a5" }}
                onClick={() => setStatusFilter("Suspended")}
              >
                <span>Filter Suspended Accounts ({totalSuspendedCount})</span>
              </button>
            )}
            {statusFilter === "Suspended" && (
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: "0.8rem", padding: "6px 12px", background: "#ffffff" }}
                onClick={() => setStatusFilter("all")}
              >
                <span>Show All Accounts</span>
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Registered Accounts Data Table Card */}
      <section className="user-mgmt-card">
        {/* Modern Controls Header (Search, Filter, Export, Add User) */}
        <div className="user-mgmt-toolbar">
          {/* Search Input with Clear Button */}
          <div className="user-mgmt-search-wrapper">
            <span className="user-mgmt-search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="user-mgmt-search-input"
              placeholder="Search user..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search users by name, email, role, or ID"
            />
            {query && (
              <button
                type="button"
                className="user-mgmt-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Controls Actions Group */}
          <div className="user-mgmt-actions-group">
            {/* Filter Popover Trigger */}
            <div style={{ position: "relative" }} ref={filterRef}>
              <button
                type="button"
                className={`user-mgmt-secondary-btn ${isFilterOpen || activeFilterCount > 0 ? "is-active" : ""}`}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                aria-label="Filter user accounts"
                aria-expanded={isFilterOpen}
              >
                <Filter size={15} />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="filter-badge-count">{activeFilterCount}</span>
                )}
              </button>

              {/* Filter Dropdown Popover */}
              {isFilterOpen && (
                <div className="user-mgmt-dropdown-popover user-mgmt-filter-popover" role="dialog">
                  <div className="filter-popover-header">
                    <h4 className="filter-popover-title">Filter Accounts</h4>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        className="filter-popover-reset"
                        onClick={resetFilters}
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  {/* Filter by Role */}
                  <div className="filter-group">
                    <label htmlFor="filterRole">Role</label>
                    <select
                      id="filterRole"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="all">All Roles</option>
                      <option value="super_admin">Super Admin (ICT)</option>
                      <option value="admin">Administrator</option>
                      <option value="program_head">Program Head</option>
                      <option value="teacher">Teacher / Faculty</option>
                    </select>
                  </div>

                  {/* Filter by Status */}
                  <div className="filter-group">
                    <label htmlFor="filterStatus">Status</label>
                    <select
                      id="filterStatus"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  {/* Filter by Program */}
                  <div className="filter-group">
                    <label htmlFor="filterProgram">Academic Program</label>
                    <select
                      id="filterProgram"
                      value={programFilter}
                      onChange={(e) => setProgramFilter(e.target.value)}
                    >
                      <option value="all">All Programs</option>
                      {programs.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.code} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Export Dropdown Trigger */}
            <div style={{ position: "relative" }} ref={exportRef}>
              <button
                type="button"
                className={`user-mgmt-secondary-btn ${isExportOpen ? "is-active" : ""}`}
                onClick={() => setIsExportOpen((prev) => !prev)}
                aria-label="Export account records"
                aria-expanded={isExportOpen}
              >
                <Download size={15} />
                <span>Export</span>
                <ChevronDown size={14} />
              </button>

              {/* Export Menu Popover */}
              {isExportOpen && (
                <div className="user-mgmt-dropdown-popover user-mgmt-export-popover" role="menu">
                  <button
                    type="button"
                    className="user-mgmt-menu-item"
                    onClick={() => exportToCsv(filteredUsers, "scsms_users_export.csv")}
                    role="menuitem"
                  >
                    <FileSpreadsheet size={16} style={{ color: "#10b981" }} />
                    <span>Export as CSV</span>
                  </button>
                  <button
                    type="button"
                    className="user-mgmt-menu-item"
                    onClick={() => exportToJson(filteredUsers, "scsms_users_export.json")}
                    role="menuitem"
                  >
                    <FileCode size={16} style={{ color: "#3b82f6" }} />
                    <span>Export as JSON</span>
                  </button>
                  <button
                    type="button"
                    className="user-mgmt-menu-item"
                    onClick={handlePrint}
                    role="menuitem"
                  >
                    <Printer size={16} style={{ color: "#6366f1" }} />
                    <span>Print Table</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add User Primary Action Button */}
            <button
              type="button"
              className="user-mgmt-primary-btn"
              onClick={handleOpenAdd}
              aria-label="Add new user account"
            >
              <Plus size={16} />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Bulk Selection Bar (appears when 1+ rows selected) */}
        {selectedIds.size > 0 && (
          <div className="user-mgmt-bulk-bar" role="region" aria-label="Bulk actions toolbar">
            <div className="bulk-bar-info">
              <CheckCircle2 size={16} />
              <span>
                <strong>{selectedIds.size}</strong> of {filteredUsers.length} account{selectedIds.size > 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="bulk-bar-actions">
              <button
                type="button"
                className="bulk-action-btn"
                onClick={() => {
                  if (selectedSuspendedCount === 0) {
                    toast.push("No suspended accounts are selected to unsuspend.", "info");
                    return;
                  }
                  setBulkActionType("activate");
                }}
                disabled={loading || selectedSuspendedCount === 0}
                style={selectedSuspendedCount === 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                title={selectedSuspendedCount === 0 ? "No suspended accounts selected" : `Unsuspend ${selectedSuspendedCount} account(s)`}
              >
                <UserCheck size={14} />
                <span>Unsuspend Selected ({selectedSuspendedCount})</span>
              </button>
              <button
                type="button"
                className="bulk-action-btn danger"
                onClick={() => {
                  if (selectedActiveCount === 0) {
                    toast.push("No active eligible accounts are selected to suspend.", "info");
                    return;
                  }
                  setBulkActionType("suspend");
                }}
                disabled={loading || selectedActiveCount === 0}
                style={selectedActiveCount === 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                title={selectedActiveCount === 0 ? "No active accounts selected" : `Suspend ${selectedActiveCount} account(s)`}
              >
                <UserX size={14} />
                <span>Suspend Selected ({selectedActiveCount})</span>
              </button>
              <button
                type="button"
                className="bulk-action-btn"
                onClick={() => {
                  const selectedList = users.filter((u) => selectedIds.has(u.id));
                  exportToCsv(selectedList, "scsms_selected_accounts.csv");
                }}
              >
                <Download size={14} />
                <span>Export Selected</span>
              </button>
              <button
                type="button"
                className="bulk-action-btn"
                onClick={clearSelection}
              >
                <X size={14} />
                <span>Clear Selection</span>
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        {fetching ? (
          <TableSkeleton rows={7} columns={7} />
        ) : (
          <div className="user-mgmt-table-wrap">
            <table className="user-mgmt-table" aria-label="Registered user accounts data table">
              <thead>
                <tr>
                  <th className="user-mgmt-checkbox-cell">
                    <input
                      type="checkbox"
                      className="custom-table-checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all accounts on current page"
                    />
                  </th>
                  <th>USER</th>
                  <th>ROLE</th>
                  <th>PROGRAM / DEPT</th>
                  <th>STATUS</th>
                  <th>JOINED DATE</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="user-mgmt-empty-state">
                        <p className="empty-state-title">No user accounts found</p>
                        <p className="empty-state-desc">
                          {query || roleFilter !== "all" || statusFilter !== "all" || programFilter !== "all"
                            ? "Try adjusting your search criteria, role, or active status filters."
                            : "No registered accounts exist yet. Click 'Add User' above to register the first account."}
                        </p>
                        {(query || roleFilter !== "all" || statusFilter !== "all" || programFilter !== "all") && (
                          <button
                            type="button"
                            className="empty-state-reset-btn"
                            onClick={resetFilters}
                          >
                            Reset All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const isSelected = selectedIds.has(u.id);
                    const isActionOpen = openRowActionId === u.id;
                    const isSelf = isSelfUser(u);
                    const isSuspended = String(u.status || "").trim().toLowerCase() === "suspended";

                    return (
                      <tr key={u.id} className={`${isSelected ? "is-selected" : ""} ${isSuspended ? "user-mgmt-row-suspended" : ""}`}>
                        {/* Checkbox Column */}
                        <td className="user-mgmt-checkbox-cell">
                          <input
                            type="checkbox"
                            className="custom-table-checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(u.id)}
                            aria-label={`Select account for ${u.name}`}
                          />
                        </td>

                        {/* USER Column (Avatar with suspended sign, Name with badge, Email, Monospace System ID) */}
                        <td>
                          <div className="user-identity-cell">
                            <div className="user-avatar-wrap">
                              <div className={`user-avatar-circle ${isSuspended ? "suspended" : ""}`} aria-hidden="true">
                                {getInitials(u.name)}
                              </div>
                              {isSuspended && (
                                <span className="user-avatar-suspended-badge" title="Account is Suspended">
                                  <UserX size={9} />
                                </span>
                              )}
                            </div>
                            <div className="user-identity-details">
                              <span className="user-identity-name">
                                {u.name}
                                {isSelf && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      fontSize: "0.72rem",
                                      color: "var(--srcb-blue-strong)",
                                      fontWeight: 700,
                                    }}
                                  >
                                    (You)
                                  </span>
                                )}
                                {isSuspended && (
                                  <span
                                    className="pill pill--amber"
                                    style={{
                                      marginLeft: 6,
                                      fontSize: "0.68rem",
                                      padding: "1px 6px",
                                      fontWeight: 700,
                                      letterSpacing: "0.02em",
                                    }}
                                  >
                                    🔒 SUSPENDED
                                  </span>
                                )}
                              </span>
                              <span className="user-identity-email">{u.email}</span>
                              <span className="user-identity-id">
                                {formatSystemId(u.id)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ROLE Column */}
                        <td>{getRoleBadge(u.role)}</td>

                        {/* PROGRAM / DEPT Column */}
                        <td>
                          {u.program ? (
                            <span className="pill" style={{ fontWeight: 700 }}>
                              <Building2 size={13} style={{ marginRight: 4 }} />
                              {u.program}
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.82rem", color: "var(--srcb-text-muted)" }}>
                              {u.role === "super_admin"
                                ? "ICT Office"
                                : u.role === "admin"
                                ? "Registrar Office"
                                : "Institutional"}
                            </span>
                          )}
                        </td>

                        {/* STATUS Column */}
                        <td>
                          <span
                            className={`status-indicator-pill ${
                              isSuspended ? "suspended" : "active"
                            }`}
                          >
                            <span className="status-dot" aria-hidden="true" />
                            <span>{isSuspended ? "Suspended (Blocked)" : "Active"}</span>
                          </span>
                        </td>

                        {/* JOINED DATE Column */}
                        <td>
                          <span style={{ fontSize: "0.84rem", color: "var(--srcb-text)" }}>
                            {formatJoinedDate(u.createdAt)}
                          </span>
                        </td>

                        {/* ACTIONS Dropdown Column */}
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{ position: "relative", display: "inline-block" }}
                            ref={isActionOpen ? actionMenuRef : undefined}
                          >
                            <button
                              type="button"
                              className={`row-actions-trigger ${isActionOpen ? "is-open" : ""}`}
                              onClick={() =>
                                setOpenRowActionId((prev) => (prev === u.id ? null : u.id))
                              }
                              aria-label={`Actions for ${u.name}`}
                              aria-expanded={isActionOpen}
                            >
                              <span>Actions</span>
                              <ChevronDown size={13} />
                            </button>

                            {/* Row Action Dropdown Popover */}
                            {isActionOpen && (
                              <div className="user-mgmt-dropdown-popover" role="menu">
                                <button
                                  type="button"
                                  className="user-mgmt-menu-item"
                                  onClick={() => handleView(u)}
                                  role="menuitem"
                                >
                                  <Eye size={15} />
                                  <span>View Profile</span>
                                </button>
                                <button
                                  type="button"
                                  className="user-mgmt-menu-item"
                                  onClick={() => handleEdit(u)}
                                  role="menuitem"
                                >
                                  <Edit2 size={15} />
                                  <span>Edit Profile</span>
                                </button>

                                {/* Dynamic Suspend or Unsuspend / Reactivate Action */}
                                {isSuspended ? (
                                  <button
                                    type="button"
                                    className="user-mgmt-menu-item"
                                    onClick={() => {
                                      setOpenRowActionId(null);
                                      setUserToActivate(u);
                                    }}
                                    role="menuitem"
                                  >
                                    <UserCheck size={15} style={{ color: "#10b981" }} />
                                    <span style={{ color: "#059669", fontWeight: 600 }}>
                                      Unsuspend / Reactivate
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="user-mgmt-menu-item"
                                    onClick={() => {
                                      if (isSelf) {
                                        toast.push("You cannot suspend your own account.", "info");
                                        return;
                                      }
                                      setOpenRowActionId(null);
                                      setUserToSuspend(u);
                                    }}
                                    disabled={isSelf}
                                    style={isSelf ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                                    title={isSelf ? "You cannot suspend your own account." : undefined}
                                    role="menuitem"
                                  >
                                    <UserX size={15} style={{ color: "#f59e0b" }} />
                                    <span style={{ color: "#d97706", fontWeight: 600 }}>
                                      Suspend Account
                                    </span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="user-mgmt-menu-item"
                                  onClick={() => handleOpenResetPassword(u)}
                                  role="menuitem"
                                >
                                  <KeyRound size={15} style={{ color: "#6366f1" }} />
                                  <span>Reset Password</span>
                                </button>
                                <div className="user-mgmt-menu-divider" />
                                <button
                                  type="button"
                                  className="user-mgmt-menu-item danger"
                                  onClick={() => {
                                    if (isSelf) {
                                      toast.push("You cannot delete your own account.", "info");
                                      return;
                                    }
                                    setOpenRowActionId(null);
                                    setUserToDelete(u);
                                  }}
                                  disabled={isSelf}
                                  style={isSelf ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                                  title={isSelf ? "You cannot delete your own account." : undefined}
                                  role="menuitem"
                                >
                                  <Trash2 size={15} />
                                  <span>Delete User</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Summary Footer */}
        <div className="user-mgmt-pagination">
          <div className="pagination-summary">
            {filteredUsers.length === 0
              ? "Showing 0 entries"
              : `Showing ${Math.min(
                  (currentPage - 1) * pageSize + 1,
                  filteredUsers.length
                )} to ${Math.min(
                  currentPage * pageSize,
                  filteredUsers.length
                )} of ${filteredUsers.length} entries`}
          </div>

          <div className="pagination-controls-group">
            {/* Rows per page selector */}
            <div className="pagination-rows-select">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Select rows per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Pagination Navigation */}
            <div className="pagination-nav-buttons" role="navigation" aria-label="Pagination">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
                aria-label="First Page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous Page"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Numbered page buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 5) return true;
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                  );
                })
                .map((page, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && page - prev > 1;

                  return (
                    <div key={page} style={{ display: "inline-flex", alignItems: "center" }}>
                      {showEllipsis && (
                        <span style={{ padding: "0 4px", color: "var(--srcb-text-muted)", fontSize: "0.85rem" }}>
                          …
                        </span>
                      )}
                      <button
                        type="button"
                        className={`pagination-btn ${currentPage === page ? "is-active" : ""}`}
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Page ${page}`}
                        aria-current={currentPage === page ? "page" : undefined}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}

              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Next Page"
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Last Page"
                aria-label="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* View User Profile / Dossier Modal */}
      <Modal
        isOpen={Boolean(viewingUser)}
        title="User Account Details"
        description="Comprehensive institutional profile, security parameters, and access permissions."
        onClose={() => setViewingUser(null)}
      >
        {viewingUser && (
          <div className="user-dossier-card">
            <div className="user-dossier-header">
              <div className="user-dossier-avatar">
                {getInitials(viewingUser.name)}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--srcb-navy)" }}>
                  {viewingUser.name}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--srcb-text-muted)" }}>
                  {viewingUser.email}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  {getRoleBadge(viewingUser.role)}
                  <span
                    className={`status-indicator-pill ${
                      viewingUser.status === "Suspended" ? "suspended" : "active"
                    }`}
                  >
                    <span className="status-dot" aria-hidden="true" />
                    <span>{viewingUser.status || "Active"}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="user-dossier-grid">
              <div className="dossier-field">
                <span className="dossier-field-label">Institutional ID</span>
                <span className="dossier-field-value" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                  {formatSystemId(viewingUser.id)}
                </span>
              </div>

              <div className="dossier-field">
                <span className="dossier-field-label">System Role</span>
                <span className="dossier-field-value">
                  {getRoleLabel(viewingUser.role)}
                </span>
              </div>

              <div className="dossier-field">
                <span className="dossier-field-label">Department / Program</span>
                <span className="dossier-field-value">
                  {viewingUser.program || (viewingUser.role === "super_admin" ? "ICT Office" : "Registrar")}
                </span>
              </div>

              <div className="dossier-field">
                <span className="dossier-field-label">Account Created</span>
                <span className="dossier-field-value">
                  {formatJoinedDate(viewingUser.createdAt)}
                </span>
              </div>

              {viewingUser.teacherId && (
                <div className="dossier-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="dossier-field-label">Linked Faculty Record</span>
                  <span className="dossier-field-value">
                    {faculty.find((f) => f.id === viewingUser.teacherId)?.name || viewingUser.teacherId}
                  </span>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="user-mgmt-secondary-btn"
                onClick={() => {
                  const target = viewingUser;
                  setViewingUser(null);
                  handleOpenResetPassword(target);
                }}
              >
                <KeyRound size={15} />
                <span>Reset Password</span>
              </button>
              <button
                type="button"
                className="user-mgmt-primary-btn"
                onClick={() => {
                  const target = viewingUser;
                  setViewingUser(null);
                  handleEdit(target);
                }}
              >
                <Edit2 size={15} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Dedicated Reset Password Dialog Modal */}
      <Modal
        isOpen={Boolean(resettingUser)}
        title="Reset User Password"
        description={`Set a new institutional password for ${resettingUser?.name} (${resettingUser?.email}).`}
        onClose={() => setResettingUser(null)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field-group">
            <label htmlFor="modalNewPass">
              New Password <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="modalNewPass"
                type={showResetPassword ? "text" : "password"}
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                placeholder="Enter new password..."
                style={{ width: "100%", paddingRight: 38 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowResetPassword((prev) => !prev)}
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
                title={showResetPassword ? "Hide password" : "Show password"}
                aria-label={showResetPassword ? "Hide password" : "Show password"}
              >
                {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="user-mgmt-secondary-btn"
              style={{ fontSize: "0.78rem", height: 32, padding: "0 10px" }}
              onClick={() =>
                setResetPasswordVal("@srcb" + Math.floor(100 + Math.random() * 900))
              }
            >
              <Sparkles size={13} />
              <span>Generate Random Password</span>
            </button>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(13, 84, 153, 0.06)",
              border: "1px solid rgba(13, 84, 153, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <KeyRound size={18} style={{ color: "var(--srcb-royal)", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--srcb-navy)", lineHeight: 1.4 }}>
              The user can use this password to immediately log in and change it in their Profile settings.
            </p>
          </div>

          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="cancel-button"
              onClick={() => setResettingUser(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="action-button"
              disabled={resettingLoading || !resetPasswordVal.trim()}
              onClick={handleSaveResetPassword}
            >
              {resettingLoading ? "Updating..." : "Confirm Reset"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Suspend User Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(userToSuspend)}
        title="Suspend User Account"
        message={
          userToSuspend
            ? `Are you sure you want to suspend the account for ${userToSuspend.name} (${userToSuspend.email})? Suspending this account will immediately prevent the user from accessing SCSMS. Their account, profile, and existing academic records will be preserved and can be reactivated later.`
            : ""
        }
        confirmLabel="Suspend Account"
        variant="danger"
        loading={loading}
        onConfirm={executeSuspend}
        onCancel={() => setUserToSuspend(null)}
      />

      {/* Unsuspend / Activate User Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(userToActivate)}
        title="Unsuspend & Reactivate User Account"
        message={
          userToActivate
            ? `Are you sure you want to unsuspend and reactivate the account for ${userToActivate.name} (${userToActivate.email})? The user will immediately regain access to log in to SCSMS. All existing profiles, permissions, schedules, and class assignments remain fully preserved.`
            : ""
        }
        confirmLabel="Unsuspend Account"
        variant="primary"
        loading={loading}
        onConfirm={executeActivate}
        onCancel={() => setUserToActivate(null)}
      />

      {/* Bulk Suspend/Activate Modal */}
      <ConfirmModal
        isOpen={Boolean(bulkActionType)}
        title={bulkActionType === "suspend" ? "Bulk Suspend Accounts" : "Bulk Unsuspend & Reactivate Accounts"}
        message={
          bulkActionType === "suspend"
            ? `Are you sure you want to suspend the ${selectedActiveCount} active selected account(s)? Their access to SCSMS will be temporarily restricted while all existing academic records, schedules, and subject allocations remain preserved.`
            : `Are you sure you want to unsuspend and reactivate the ${selectedSuspendedCount} suspended selected account(s)? The users will immediately regain full access to sign in to SCSMS.`
        }
        confirmLabel={bulkActionType === "suspend" ? `Suspend ${selectedActiveCount} Account(s)` : `Unsuspend ${selectedSuspendedCount} Account(s)`}
        variant={bulkActionType === "suspend" ? "danger" : "primary"}
        loading={loading}
        onConfirm={executeBulkStatusChange}
        onCancel={() => setBulkActionType(null)}
      />

      {/* Create / Edit User Modal */}
      <Modal
        isOpen={isOpen}
        title={editingUser ? "Edit User Profile" : "Create Institutional Account"}
        description={
          editingUser
            ? "Update user profile, contact details, and department permissions."
            : "Register a new institutional user with automatic initial credentials."
        }
        onClose={() => setIsOpen(false)}
      >
        <div className="form-grid">
          {/* Required First Name, Optional Middle Name, Required Last Name */}
          <div
            style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <div className="field-group">
              <label htmlFor="userFirstName">
                First Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="userFirstName"
                value={firstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="e.g. Alan"
                required
                aria-required="true"
              />
              {firstNameError && (
                <p className="field-error-msg" role="alert">
                  ⚠️ {firstNameError}
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="userMiddleName">
                Middle Name{" "}
                <span style={{ color: "var(--srcb-text-muted)", fontSize: "0.75rem" }}>
                  (Optional)
                </span>
              </label>
              <input
                id="userMiddleName"
                value={middleName}
                onChange={(e) => handleMiddleNameChange(e.target.value)}
                placeholder="e.g. Mathison"
              />
              {middleNameError && (
                <p className="field-error-msg" role="alert">
                  ⚠️ {middleNameError}
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="userLastName">
                Last Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="userLastName"
                value={lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="e.g. Turing"
                required
                aria-required="true"
              />
              {lastNameError && (
                <p className="field-error-msg" role="alert">
                  ⚠️ {lastNameError}
                </p>
              )}
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="userEmail">
              School Email <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="userEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="username@srcb.edu.ph"
              required
              aria-required="true"
            />
          </div>

          <div className="field-group">
            <label htmlFor="userPhone">
              Phone Number{" "}
              <span style={{ color: "var(--srcb-text-muted)", fontSize: "0.75rem" }}>
                (Optional)
              </span>
            </label>
            <input
              id="userPhone"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="e.g. 09171234567"
            />
            {phoneError && (
              <p className="field-error-msg" role="alert">
                ⚠️ {phoneError}
              </p>
            )}
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
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as "Active" | "Suspended" })
              }
            >
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Initial Password Information / Password Change */}
          {editingUser ? (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="userPassword">Change Password (Optional)</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="userPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Leave blank to keep existing password"
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(13, 84, 153, 0.06)",
                border: "1px solid rgba(13, 84, 153, 0.15)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <KeyRound size={18} style={{ color: "var(--srcb-royal)", flexShrink: 0 }} />
              <p
                style={{
                  margin: 0,
                  fontSize: "0.82rem",
                  color: "var(--srcb-navy)",
                  lineHeight: 1.4,
                }}
              >
                <strong>Automated Initial Password:</strong> An initial password (
                <code
                  style={{
                    color: "#0d5499",
                    background: "rgba(255,255,255,0.7)",
                    padding: "1px 5px",
                    borderRadius: "4px",
                  }}
                >
                  @srcb123
                </code>
                ) is automatically generated for this account. The user can update their password in
                Account Settings once logged in.
              </p>
            </div>
          )}

          {form.role === "program_head" && (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="userProgram">Assigned Academic Program</label>
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

          {(form.role === "teacher" || form.role === "program_head") && (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="userTeacher">
                {form.role === "program_head"
                  ? "Link to Faculty Teaching Profile"
                  : "Link to Faculty Profile"}
              </label>
              <select
                id="userTeacher"
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              >
                <option value="">-- No link (Standalone Account) --</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department} · {f.status})
                  </option>
                ))}
              </select>
              {form.role === "program_head" && (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "0.78rem",
                    color: "var(--srcb-navy)",
                    lineHeight: 1.4,
                  }}
                >
                  💡 <strong>Teaching Load Notice:</strong> Program Heads teach major subjects (such as 3rd Year classes). Linking a faculty profile enables them to be assigned to classes and view their teaching schedule.
                </p>
              )}
            </div>
          )}

          {editingUser && (
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="modalUserStatus">Account Access Status</label>
              <select
                id="modalUserStatus"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "Active" | "Suspended" })}
              >
                <option value="Active">Active (Permitted to Sign In)</option>
                <option value="Suspended">Suspended (Access Temporarily Restricted)</option>
              </select>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="cancel-button"
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
            {loading
              ? "Saving..."
              : editingUser
              ? "Update User Profile"
              : "Create Account"}
          </button>
        </div>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete the account for ${userToDelete?.name} (${userToDelete?.email})? This action cannot be undone.`}
        confirmLabel="Delete Account"
        variant="danger"
        loading={loading}
        onConfirm={executeDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </motion.div>
  );
}
