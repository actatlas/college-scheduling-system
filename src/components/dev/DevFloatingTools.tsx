import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Wrench,
  X,
  Sparkles,
  RefreshCw,
  Trash2,
  Database,
  ChevronRight,
  ShieldAlert,
  Building2,
  GraduationCap,
  Users,
  User,
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  BookOpen,
  Tag,
  DoorOpen,
  FileText,
  KeyRound,
  Globe,
} from "lucide-react";
import { api } from "../../data/apiClient";
import { useToast } from "../common/Toast";
import "../../styles/devtools.css";

interface PresetAccount {
  label: string;
  email: string;
  pass: string;
  role: string;
  icon: React.ReactNode;
}

const PRESET_ACCOUNTS: PresetAccount[] = [
  {
    label: "Super Admin (ICT Office)",
    email: "superadmin@srcb.edu.ph",
    pass: "@superadmin123",
    role: "super_admin",
    icon: <ShieldAlert size={16} />,
  },
  {
    label: "Dean of Student Affairs (Admin)",
    email: "admin@srcb.edu.ph",
    pass: "@admin123",
    role: "admin",
    icon: <Building2 size={16} />,
  },
  {
    label: "Program Head (BSIT)",
    email: "ithead@srcb.edu.ph",
    pass: "@program123",
    role: "program_head",
    icon: <GraduationCap size={16} />,
  },
];

export function DevFloatingTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"accounts" | "roles" | "nav" | "db">("accounts");
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const currentEmail = localStorage.getItem("token") ? (localStorage.getItem("userName") || "") : "Not Logged In";
  const currentRole = (localStorage.getItem("userRole") || "guest").toLowerCase();
  const currentTeacherStatus = localStorage.getItem("teacherStatus") || "";

  // Check DB health
  useEffect(() => {
    fetch("http://localhost:4000/health")
      .then((res) => setDbHealthy(res.ok))
      .catch(() => setDbHealthy(false));
  }, [isOpen]);

  // Fetch db users when tab opened and logged in as super_admin
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (isOpen && activeTab === "accounts" && localStorage.getItem("token") && role === "super_admin") {
      api
        .get("/users")
        .then((res: any) => setDbUsers(res.data?.data || []))
        .catch(() => setDbUsers([]));
    }
  }, [isOpen, activeTab]);

  const handleSwitchToPreset = async (acc: PresetAccount) => {
    setIsSwitching(true);
    try {
      const res: any = await api.post("/auth/login", {
        email: acc.email,
        password: acc.pass,
      });

      const payload = res.data || {};
      const user = payload.user || {};
      const targetRole = acc.role || String(user.role || "admin").toLowerCase();

      localStorage.setItem("token", payload.token || "token_preset");
      localStorage.setItem("userRole", targetRole);
      localStorage.setItem("userName", user.name || acc.label);

      if (targetRole === "program_head") {
        const teacher = user.teacher || {};
        const isPartTime = acc.label.includes("Part-Time") || teacher.status === "Part-Time" || acc.email.includes("parttime") || acc.email.includes("sabuero");
        const defaultHeadId = "FAC-003";
        localStorage.setItem("teacherId", user.teacherId || teacher.id || defaultHeadId);
        localStorage.setItem("teacherStatus", isPartTime ? "Part-Time" : "Full-Time");
      } else {
        localStorage.removeItem("teacherId");
        localStorage.removeItem("teacherStatus");
      }

      if (user.program) {
        localStorage.setItem("selectedProgram", user.program);
      } else if (targetRole === "program_head") {
        localStorage.setItem("selectedProgram", "ITP");
      }

      toast.push(`Switched account to: ${acc.label}`, "success");
      navigate("/dashboard");
      window.location.reload();
    } catch (err: any) {
      const isSuspended =
        err?.code === "ACCOUNT_SUSPENDED" ||
        err?.response?.data?.code === "ACCOUNT_SUSPENDED" ||
        (typeof err?.message === "string" && err?.message.toLowerCase().includes("suspended")) ||
        (typeof err?.response?.data?.error === "string" &&
          err?.response?.data?.error.toLowerCase().includes("suspended"));

      if (isSuspended) {
        toast.push(
          "Access Denied: This account has been suspended by the Super Administrator.",
          "error"
        );
      } else {
        toast.push(err?.message || "Failed to switch account", "error");
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const handleRoleOverride = (role: string, extra?: { status?: string; teacherId?: string; program?: string }) => {
    localStorage.setItem("userRole", role);
    if (extra?.status) {
      localStorage.setItem("teacherStatus", extra.status);
    }
    if (extra?.teacherId) {
      localStorage.setItem("teacherId", extra.teacherId);
    }
    if (role === "program_head") {
      localStorage.setItem("selectedProgram", extra?.program || "ITP");
    }
    toast.push(`Dev Override: Switched view role to ${role.toUpperCase()}`, "info");
    navigate("/dashboard");
    window.location.reload();
  };

  const handleClearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("teacherId");
    localStorage.removeItem("teacherStatus");
    localStorage.removeItem("selectedProgram");
    toast.push("Cleared authentication session", "info");
    navigate("/login");
    window.location.reload();
  };

  return (
    <aside className="dev-tools-wrapper" aria-label="Development Tools Widget">
      {/* Floating Trigger Pill */}
      {!isOpen && (
        <button
          type="button"
          className="dev-tools-trigger"
          onClick={() => setIsOpen(true)}
          title="Open Developer Suite & Account Switcher"
        >
          <span
            className="dev-tools-pulse"
            style={{
              backgroundColor: dbHealthy ? "#22c55e" : dbHealthy === false ? "#ef4444" : "#eab308",
              boxShadow: `0 0 8px ${dbHealthy ? "#22c55e" : dbHealthy === false ? "#ef4444" : "#eab308"}`,
            }}
          />
          <Wrench size={14} color="#38bdf8" />
          <span>Dev Tools</span>
        </button>
      )}

      {/* Expanded Floating HUD Panel */}
      {isOpen && (
        <div className="dev-tools-panel">
          <div className="dev-tools-header">
            <div className="dev-tools-title">
              <Sparkles size={16} color="#38bdf8" />
              <span>Dev Suite</span>
              <span className="dev-tools-badge">Localhost</span>
            </div>
            <button
              type="button"
              className="dev-tools-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close Dev Tools"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="dev-tools-tabs">
            <button
              type="button"
              className={`dev-tools-tab ${activeTab === "accounts" ? "active" : ""}`}
              onClick={() => setActiveTab("accounts")}
            >
              Accounts
            </button>
            <button
              type="button"
              className={`dev-tools-tab ${activeTab === "roles" ? "active" : ""}`}
              onClick={() => setActiveTab("roles")}
            >
              Roles
            </button>
            <button
              type="button"
              className={`dev-tools-tab ${activeTab === "nav" ? "active" : ""}`}
              onClick={() => setActiveTab("nav")}
            >
              Jump
            </button>
            <button
              type="button"
              className={`dev-tools-tab ${activeTab === "db" ? "active" : ""}`}
              onClick={() => setActiveTab("db")}
            >
              DB Health
            </button>
          </div>

          <div className="dev-tools-content">
            {/* Active Session Info Box */}
            <div className="dev-session-card">
              <div className="dev-session-user">
                <span className="dev-session-name">{currentEmail || "Guest"}</span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(56, 189, 248, 0.2)",
                    color: "#38bdf8",
                    fontWeight: 700,
                  }}
                >
                  {currentRole.toUpperCase()}
                </span>
              </div>
              <div className="dev-session-meta">
                Route: <code style={{ color: "#38bdf8" }}>{location.pathname}</code>
                {currentTeacherStatus && ` · ${currentTeacherStatus}`}
              </div>
            </div>

            {/* TAB 1: ACCOUNTS */}
            {activeTab === "accounts" && (
              <div className="dev-account-list">
                <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "0 0 4px 2px", fontWeight: 600 }}>
                  1-Click Switch & Authenticate:
                </p>
                {PRESET_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.label}
                    type="button"
                    className="dev-account-btn"
                    disabled={isSwitching}
                    onClick={() => handleSwitchToPreset(acc)}
                  >
                    <div className="dev-account-info">
                      <span className="dev-account-name">
                        <span style={{ marginRight: 6 }}>{acc.icon}</span>
                        {acc.label}
                      </span>
                      <span className="dev-account-email">{acc.email}</span>
                    </div>
                    <ChevronRight size={14} color="#64748b" />
                  </button>
                ))}

                {dbUsers.length > 0 && (
                  <>
                    <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "8px 0 4px 2px", fontWeight: 600 }}>
                      Live Database Users ({dbUsers.length}):
                    </p>
                    {dbUsers.map((u: any) => {
                      const isUserSuspended = String(u.status || "").toLowerCase() === "suspended";
                      return (
                        <button
                          key={u.id}
                          type="button"
                          className="dev-account-btn"
                          disabled={isSwitching || isUserSuspended}
                          style={isUserSuspended ? { opacity: 0.6, cursor: "not-allowed", borderLeft: "3px solid #ef4444" } : {}}
                          onClick={() => {
                            if (isUserSuspended) {
                              toast.push(`Account for ${u.email} is SUSPENDED and cannot log in.`, "error");
                              return;
                            }
                            handleSwitchToPreset({
                              label: `${u.name} (${u.role})`,
                              email: u.email,
                              pass: "@srcb123",
                              role: u.role,
                              icon: <User size={16} />,
                            });
                          }}
                        >
                          <div className="dev-account-info">
                            <span className="dev-account-name">
                              {u.name}
                              {isUserSuspended && (
                                <span style={{ marginLeft: 6, fontSize: "0.68rem", color: "#dc2626", fontWeight: 800 }}>
                                  [SUSPENDED]
                                </span>
                              )}
                            </span>
                            <span className="dev-account-email">
                              {u.email} · {u.role}
                            </span>
                          </div>
                          <ChevronRight size={14} color="#64748b" />
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* TAB 2: ROLES */}
            {activeTab === "roles" && (
              <div className="dev-account-list">
                <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "0 0 6px 2px", fontWeight: 600 }}>
                  Simulate Role Privilege Matrix:
                </p>
                <button
                  type="button"
                  className={`dev-account-btn ${currentRole === "super_admin" ? "active" : ""}`}
                  onClick={() => handleRoleOverride("super_admin")}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <ShieldAlert size={15} /> Super Admin (ICT Office - Full CRUD)
                  </span>
                </button>
                <button
                  type="button"
                  className={`dev-account-btn ${currentRole === "admin" ? "active" : ""}`}
                  onClick={() => handleRoleOverride("admin")}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Building2 size={15} /> Dean of Student Affairs (Admin)
                  </span>
                </button>
                <button
                  type="button"
                  className={`dev-account-btn ${currentRole === "program_head" ? "active" : ""}`}
                  onClick={() => handleRoleOverride("program_head", { program: "ITP" })}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <GraduationCap size={15} /> Program Head (BSIT / ITP)
                  </span>
                </button>
              </div>
            )}

            {/* TAB 3: QUICK JUMP */}
            {activeTab === "nav" && (
              <div className="dev-nav-grid">
                {[
                  { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={16} /> },
                  { label: "Class Schedules", path: "/schedules", icon: <CalendarDays size={16} /> },
                  { label: "Exam Schedules", path: "/exams", icon: <CalendarCheck size={16} /> },
                  { label: "ICT Users", path: "/users", icon: <Users size={16} /> },
                  { label: "Faculty", path: "/faculty", icon: <Users size={16} /> },
                  { label: "Subjects", path: "/subjects", icon: <BookOpen size={16} /> },
                  { label: "Sections", path: "/sections", icon: <Tag size={16} /> },
                  { label: "Rooms & Labs", path: "/rooms", icon: <DoorOpen size={16} /> },
                  { label: "Reports", path: "/reports", icon: <FileText size={16} /> },
                  { label: "Login Page", path: "/login", icon: <KeyRound size={16} /> },
                  { label: "Landing Page", path: "/", icon: <Globe size={16} /> },
                ].map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className="dev-nav-btn"
                    onClick={() => {
                      navigate(item.path);
                      setIsOpen(false);
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 4: DB & SYSTEM */}
            {activeTab === "db" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "rgba(30, 41, 59, 0.4)",
                    borderRadius: 8,
                  }}
                >
                  <Database size={16} color={dbHealthy ? "#22c55e" : "#ef4444"} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    MySQL Database:{" "}
                    <span style={{ color: dbHealthy ? "#22c55e" : "#ef4444" }}>
                      {dbHealthy ? "Online (Port 4000)" : "Disconnected / Offline"}
                    </span>
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.5 }}>
                  <strong>Database Name:</strong> <code>srcb_scheduler</code>
                  <br />
                  <strong>Backend:</strong> <code>http://localhost:4000/api</code>
                </div>
              </div>
            )}
          </div>

          <div className="dev-tools-footer">
            <button
              type="button"
              className="dev-action-link"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={11} style={{ marginRight: 4 }} /> Reload Page
            </button>
            <button
              type="button"
              className="dev-action-link danger"
              onClick={handleClearAuth}
            >
              <Trash2 size={11} style={{ marginRight: 4 }} /> Clear Session
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
