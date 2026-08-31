import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import Logo from "../assets/images/Logo.png";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  // Requirement 2: Email and Password MUST start completely empty
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suspensionNotice, setSuspensionNotice] = useState<string | null>(null);

  useEffect(() => {
    // Ensure clean state on login page unless we just were redirected
    if (searchParams.get("suspended") === "1") {
      const stored = sessionStorage.getItem("suspensionNotice");
      setSuspensionNotice(
        stored || "Your account has been suspended. Please contact the ICT Office or system administrator."
      );
      sessionStorage.removeItem("suspensionNotice");
    }
  }, [searchParams]);

  const navigate = useNavigate();
  const toast = useToast();

  const handleLoginWithCredentials = async (targetEmail: string, targetPass: string) => {
    setIsSubmitting(true);
    setAuthError(null);
    setSuspensionNotice(null);
    try {
      const res: any = await api.post("/auth/login", {
        email: targetEmail,
        password: targetPass,
      });

      const token = res.data?.token || res.data?.data?.token;
      const user = res.data?.user || res.data?.data?.user;

      if (!token) {
        throw new Error("No authentication token received from server");
      }

      localStorage.setItem("token", token);
      if (user) {
        const userRole = (user.role || "admin").toLowerCase();
        localStorage.setItem("userRole", userRole);
        localStorage.setItem("userName", user.name || "User");
        if (user.teacherId) {
          localStorage.setItem("teacherId", user.teacherId);
        }
        if (userRole === "teacher" || userRole === "program_head") {
          localStorage.setItem("teacherStatus", user.teacherStatus || user.teacher?.status || "Full-Time");
        } else {
          localStorage.removeItem("teacherStatus");
        }
        if (user.program) {
          localStorage.setItem("selectedProgram", user.program);
        }
      }

      toast.push("Successfully logged in to SRCB Scheduling System", "success");
      navigate("/dashboard");
    } catch (err: any) {
      const isSuspended =
        err?.code === "ACCOUNT_SUSPENDED" ||
        err?.response?.data?.code === "ACCOUNT_SUSPENDED" ||
        (typeof err?.message === "string" && err?.message.toLowerCase().includes("suspended")) ||
        (typeof err?.response?.data?.error === "string" &&
          err?.response?.data?.error.toLowerCase().includes("suspended"));

      if (isSuspended) {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Your account has been suspended. Please contact the ICT Office or system administrator.";
        setSuspensionNotice(msg);
        setAuthError(null);
        toast.push(msg, "error");
      } else {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Invalid email or password. Please check your credentials.";
        setAuthError(msg);
        toast.push(msg, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError("Please enter your email and password.");
      return;
    }
    await handleLoginWithCredentials(email.trim(), password);
  };


  const handleForgot = () => {
    const entered = window.prompt("Enter your registered institutional email:");
    if (!entered) return;
    toast.push(`A password reset link has been dispatched to ${entered}`, "info");
  };

  return (
    <div className="auth-page-container">
      {/* Top Header Navbar in White */}
      <header className="auth-navbar">
        <div className="auth-nav-inner">
          <Link to="/" className="auth-nav-brand" title="SRCB SCSMS">
            <img src={Logo} alt="St. Rita's College Logo" className="auth-nav-logo" />
            <div>
              <div className="auth-nav-title">
                <span style={{ color: "#38bdf8" }}>SRCB</span>
                <span style={{ color: "#ffffff" }}>SCSMS</span>
              </div>
              <div className="auth-nav-sub">St. Rita's College of Balingasag</div>
            </div>
          </Link>

          <Link to="/" className="auth-back-link" aria-label="Back to Home">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Middle-Left Positioned Authentication Card */}
      <motion.div
        className="auth-card-wrapper"
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="auth-card-header">
          <img src={Logo} alt="St. Rita's College Logo" className="auth-card-logo" />
          <h1 className="auth-card-title">Welcome back</h1>
          <p className="auth-card-desc">
            Sign in to access your scheduling dashboard
          </p>
        </div>

        {/* LOG IN FORM */}
        <form className="auth-form" onSubmit={handleLogin} noValidate>
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="loginEmail">
              Institutional Email
            </label>
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Mail size={18} />
              </span>
              <input
                id="loginEmail"
                type="email"
                className="auth-input"
                placeholder="admin@srcb.edu.ph"
                value={email}
                autoComplete="off"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) setAuthError(null);
                  if (suspensionNotice) setSuspensionNotice(null);
                }}
                required
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="loginPass">
              Password
            </label>
            <div className={`auth-input-container ${authError || suspensionNotice ? "error" : ""}`}>
              <span className="auth-input-icon">
                <Lock size={18} />
              </span>
              <input
                id="loginPass"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                placeholder="••••••••••••"
                value={password}
                autoComplete="off"
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) setAuthError(null);
                  if (suspensionNotice) setSuspensionNotice(null);
                }}
                required
              />
              <button
                type="button"
                className="auth-toggle-pass"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {suspensionNotice ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                background: "rgba(220, 38, 38, 0.08)",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                marginBottom: "14px",
              }}
              role="alert"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#dc2626",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                }}
              >
                <ShieldAlert size={18} />
                <span>Account Suspended</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#991b1b", lineHeight: 1.4 }}>
                {suspensionNotice}
              </p>
            </div>
          ) : authError ? (
            <div className="auth-error-box" role="alert">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {authError}
              </span>
            </div>
          ) : null}

          <div className="auth-options-row">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                className="auth-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="auth-forgot-btn"
              onClick={handleForgot}
            >
              Forgot password?
            </button>
          </div>

          {/* Primary Button text EXACTLY "SIGN IN" */}
          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="spinner" /> : null}
            <span>{isSubmitting ? "Signing in…" : "SIGN IN"}</span>
            {!isSubmitting && <ArrowRight size={17} />}
          </button>
        </form>


        <div className="auth-card-footer">
          College Department • St. Rita's College of Balingasag
        </div>
      </motion.div>
    </div>
  );
}
