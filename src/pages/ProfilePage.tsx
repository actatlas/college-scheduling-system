import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { useNotifications } from "../contexts/NotificationContext";
import { formatSystemId } from "../utils/idFormatter";
import {
  UserCheck,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  Building2,
  Mail,
  Hash,
} from "lucide-react";

import { CardGridSkeleton } from "../components/common/Skeleton";

export function ProfilePage() {
  const toast = useToast();
  const { addNotification } = useNotifications();

  const role = (localStorage.getItem("userRole") || "teacher").toLowerCase();
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "User");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string>("1");
  const [userProgram, setUserProgram] = useState<string>("");
  const [teacherStatus, setTeacherStatus] = useState<string>(localStorage.getItem("teacherStatus") || "Full-Time");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const res = await api.get("/auth/me");
        const u = res.data?.user || res.data;
        if (u) {
          if (u.name) {
            setUserName(u.name);
            localStorage.setItem("userName", u.name);
          }
          if (u.email) setUserEmail(u.email);
          if (u.id) setUserId(String(u.id));
          if (u.program || u.programCode) setUserProgram(u.program || u.programCode);
          if (u.teacher?.phone) setPhone(u.teacher.phone);
          if (u.teacher?.status) {
            setTeacherStatus(u.teacher.status);
            localStorage.setItem("teacherStatus", u.teacher.status);
          }
        }
      } catch {
        // Fallback to local storage
        setUserEmail(
          role === "super_admin"
            ? "superadmin@srcb.edu.ph"
            : role === "admin"
              ? "admin@srcb.edu.ph"
              : role === "program_head"
                ? "programhead@srcb.edu.ph"
                : "teacher@srcb.edu.ph"
        );
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [role]);

  const handleNameChange = (val: string) => {
    const lettersOnly = /^[A-Za-z\s.,'-]*$/;
    if (!lettersOnly.test(val)) {
      setNameError("Please enter characters only.");
    } else {
      setNameError("");
    }
    setUserName(val);
  };

  const handlePhoneChange = (val: string) => {
    const digitsOnly = /^[\d\s+-]*$/;
    if (!digitsOnly.test(val)) {
      setPhoneError("Please enter digits and valid phone characters only.");
    } else {
      setPhoneError("");
    }
    setPhone(val);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError || phoneError || !userName.trim()) {
      toast.push("Please check all fields before saving.", "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      await api.put("/auth/profile", {
        name: userName.trim(),
        phone: phone.trim(),
      });
      localStorage.setItem("userName", userName.trim());
      toast.push("Personal account profile updated successfully.", "success");
      addNotification({
        title: "Account Profile Updated",
        message: "Your personal contact information was saved.",
        type: "success",
        link: "/profile",
      });
    } catch (err: any) {
      toast.push(err?.message || "Failed to update profile", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.push("Please provide your current password.", "error");
      return;
    }
    if (newPassword.length < 6) {
      toast.push("New password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.push("New passwords do not match. Please verify.", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.push("Password changed successfully! Keep your credentials safe.", "success");
      addNotification({
        title: "Security Password Changed",
        message: "Your institutional account password was changed.",
        type: "success",
        link: "/profile",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.push(err?.response?.data?.error || err?.message || "Failed to change password. Please verify current password.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "super_admin":
        return "ICT Super Administrator";
      case "admin":
        return "College Administrator (Registrar)";
      case "program_head":
        return `Program Head ${userProgram ? `(${userProgram})` : ""}`;
      case "teacher":
        return `Faculty Member (${teacherStatus})`;
      default:
        return "Institutional User";
    }
  };

  const getRolePillClass = () => {
    switch (role) {
      case "super_admin":
        return "pill--danger";
      case "admin":
        return "pill--royal";
      case "program_head":
        return "pill--success";
      case "teacher":
        return "pill--warning";
      default:
        return "pill--royal";
    }
  };

  const displayId = formatSystemId(userId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="My Account & Profile"
        description="View institutional identity credentials, update personal contact information, and manage security settings."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>My Account</strong>
          </>
        }
      />

      {isLoadingProfile ? (
        <CardGridSkeleton count={2} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* 1. Institutional Identity Card (Read-Only & System Governed) */}
        <article className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card__header" style={{ alignItems: "center" }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Institutional Identity</p>
              <h3 style={{ margin: "4px 0 0" }}>Account Profile</h3>
            </div>
            <Shield size={20} color="var(--srcb-navy)" />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 14px", background: "var(--srcb-surface-alt, #f8fafc)", borderRadius: "12px", border: "1px solid var(--srcb-border)" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--srcb-navy, #0f2c59), #0284c7)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1.2rem",
                boxShadow: "0 4px 12px rgba(15, 44, 89, 0.2)",
                flexShrink: 0,
              }}
            >
              {userName.charAt(0).toUpperCase() || "U"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <strong style={{ fontSize: "1.05rem", color: "var(--srcb-text)" }}>{userName}</strong>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span className={`pill ${getRolePillClass()}`} style={{ fontSize: "0.74rem" }}>
                  {getRoleLabel()}
                </span>
                <span className="pill" style={{ fontSize: "0.74rem", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                  ID: {displayId}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "0.88rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--srcb-border)" }}>
              <span style={{ color: "var(--srcb-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <Mail size={15} /> School Email
              </span>
              <strong style={{ color: "var(--srcb-text)" }}>{userEmail || "username@srcb.edu.ph"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--srcb-border)" }}>
              <span style={{ color: "var(--srcb-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <Hash size={15} /> System ID
              </span>
              <strong style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--srcb-navy)" }}>{displayId}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--srcb-border)" }}>
              <span style={{ color: "var(--srcb-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={15} /> Department / Program
              </span>
              <strong style={{ color: "var(--srcb-text)" }}>
                {userProgram ? `${userProgram} Department` : role === "super_admin" ? "ICT Office" : "Registrar & Academic Affairs"}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--srcb-border)" }}>
              <span style={{ color: "var(--srcb-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <UserCheck size={15} /> Account Status
              </span>
              <span className="pill pill--success" style={{ fontSize: "0.72rem" }}>Active</span>
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(15, 44, 89, 0.04)",
              border: "1px solid rgba(15, 44, 89, 0.1)",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginTop: "auto",
            }}
          >
            <AlertCircle size={16} color="var(--srcb-navy)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--srcb-text-muted)", lineHeight: 1.4 }}>
              <strong>Role Governance:</strong> Assigned programs, academic levels, and system permissions are set centrally by College Administrators and cannot be modified directly.
            </p>
          </div>
        </article>

        {/* 2. Personal Information (Editable) */}
        <article className="card">
          <div className="card__header">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Contact Details</p>
              <h3 style={{ margin: "4px 0 0" }}>Personal Information</h3>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
                Update your display name and contact phone number.
              </p>
            </div>
            <UserCheck size={20} color="var(--srcb-navy)" />
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
            <div className="field-group">
              <label htmlFor="profileName">
                Full Display Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="profileName"
                value={userName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Alan Turing"
                required
              />
              {nameError && (
                <p className="field-error-msg" role="alert" style={{ color: "#dc2626", fontSize: "0.78rem", margin: "2px 0 0" }}>
                  ⚠️ {nameError}
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="profileEmail">
                School Email <span style={{ color: "var(--srcb-text-muted)", fontSize: "0.75rem" }}>(Read-Only)</span>
              </label>
              <input
                id="profileEmail"
                type="email"
                value={userEmail || "username@srcb.edu.ph"}
                disabled
                style={{ background: "var(--srcb-surface-alt, #f8fafc)", color: "var(--srcb-text-muted)", cursor: "not-allowed" }}
              />
            </div>

            <div className="field-group">
              <label htmlFor="profilePhone">
                Phone / Mobile Number <span style={{ color: "var(--srcb-text-muted)", fontSize: "0.75rem" }}>(Optional)</span>
              </label>
              <input
                id="profilePhone"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. 09171234567"
              />
              {phoneError && (
                <p className="field-error-msg" role="alert" style={{ color: "#dc2626", fontSize: "0.78rem", margin: "2px 0 0" }}>
                  ⚠️ {phoneError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="action-button"
              disabled={isSavingProfile || Boolean(nameError || phoneError)}
              style={{ marginTop: 8 }}
            >
              <Save size={16} />
              {isSavingProfile ? "Saving Profile..." : "Save Profile Details"}
            </button>
          </form>
        </article>

        {/* 3. Password & Security Management */}
        <article className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card__header">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Authentication Security</p>
              <h3 style={{ margin: "4px 0 0" }}>Change Account Password</h3>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
                Update your security password. New password must be at least 6 characters long.
              </p>
            </div>
            <KeyRound size={20} color="var(--srcb-navy)" />
          </div>

          <form onSubmit={handleChangePassword} style={{ marginTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <div className="field-group">
                <label htmlFor="currentPassword">Current Password <span style={{ color: "#dc2626" }}>*</span></label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    style={{ width: "100%", paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", padding: 4 }}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="newPassword">New Password <span style={{ color: "#dc2626" }}>*</span></label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    style={{ width: "100%", paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((prev) => !prev)}
                    style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", padding: 4 }}
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="confirmPassword">Confirm New Password <span style={{ color: "#dc2626" }}>*</span></label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    style={{ width: "100%", paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", padding: 4 }}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="submit"
                className="action-button"
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                <Lock size={16} />
                {isChangingPassword ? "Updating Password..." : "Update Security Password"}
              </button>
            </div>
          </form>
        </article>
      </div>
      )}
    </motion.div>
  );
}
