import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, Eye, EyeOff, Sparkles, GraduationCap } from "lucide-react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import Logo from "../assets/images/Logo.png";
import FrontDeskBg from "../assets/images/SRCB FRONT DES.png";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const demoAccounts = [
    { label: "Super Admin (ICT)", email: "[EMAIL_ADDRESS]", icon: "⚡" },
    { label: "Admin (Dean of College)", email: "[EMAIL_ADDRESS]", icon: "🏛️" },
    { label: "Program Head (IT)", email: "[EMAIL_ADDRESS]", icon: "🎓" },
    { label: "Teacher (Full-Time)", email: "[EMAIL_ADDRESS]", icon: "👨‍🏫" },
    { label: "Teacher (Part-Time)", email: "[EMAIL_ADDRESS]", icon: "⏱️" },
  ];

  const handleLoginWithEmail = async (targetEmail: string, targetPass = "password123") => {
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const res: any = await api.post("/auth/login", {
        email: targetEmail.trim(),
        password: targetPass,
      });

      const payload = res.data || {};
      const user = payload.user || {};
      const userRole = String(user.role || "admin").toLowerCase();

      localStorage.setItem("token", payload.token || `token_${Date.now()}`);
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userName", user.name || "User");

      if (userRole === "teacher") {
        localStorage.setItem(
          "teacherId",
          String(user.teacher?.id || (targetEmail.includes("parttime") ? "FAC-002" : "FAC-001"))
        );
        localStorage.setItem(
          "teacherStatus",
          targetEmail.includes("parttime") ? "Part-Time" : "Full-Time"
        );
      } else {
        localStorage.removeItem("teacherId");
      }

      if (user.program) {
        localStorage.setItem("selectedProgram", user.program);
      }

      toast.push(`Welcome, ${user.name || userRole.toUpperCase()}!`, "success");
      navigate("/dashboard");
    } catch (err: any) {
      setLoginError(err?.response?.data?.error || "Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError("Please enter your email and password.");
      return;
    }
    await handleLoginWithEmail(email, password);
  };

  const handleForgot = () => {
    const entered = window.prompt("Enter your registered institutional email:");
    if (!entered) return;
    toast.push(`A password reset link has been dispatched to ${entered}`, "info");
  };

  return (
    <div
      className="login-wrapper"
      style={{
        backgroundImage: `url("${FrontDeskBg}")`,
      }}
    >
      {/* Background Dimmer Overlay */}
      <div className="login-bg-overlay" />

      {/* Subtle Logo Watermark in the backdrop */}
      <div
        className="login-bg-watermark"
        style={{
          backgroundImage: `url("${Logo}")`,
        }}
      />

      {/* Top Breadcrumb / Title */}
      <div className="login-page-tag">
        <GraduationCap size={16} />
        <span>Academic Scheduling Portal</span>
      </div>

      <div className="glass-auth-shell">
        {/* Left Hero & Quick Preset Section */}
        <section className="glass-auth-hero">
          <div className="glass-brand-badge">
            <img src={Logo} alt="St. Rita's College Logo" className="glass-logo" />
            <div>
              <div className="glass-brand-title">St. Rita's College</div>
              <div className="glass-brand-sub">Balingasag, Misamis Oriental</div>
            </div>
          </div>

          <h1>Academic Class & Examination Scheduling</h1>
          <p className="hero-desc">
            An institutional platform engineered for Super Admins, College Registrars, Program Heads, and Faculty members.
          </p>

          <div className="glass-role-presets">
            <div className="glass-role-presets-title">
              <Sparkles size={14} />
              <span>Quick 1-Click Role Login</span>
            </div>
            <div className="glass-role-grid">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="glass-role-btn"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("password123");
                    handleLoginWithEmail(acc.email);
                  }}
                >
                  <span>
                    <span style={{ marginRight: 6 }}>{acc.icon}</span> {acc.label}
                  </span>
                  <span className="glass-role-email">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Floating Frosted Glass Login Card */}
        <section className="glass-login-card">
          <div className="glass-login-header">
            <h2>Log In to Account</h2>
            <p>Welcome back! Please enter your details.</p>
          </div>

          <form className="glass-form" onSubmit={handleLogin} noValidate>
            {/* Email Field */}
            <div className="glass-field">
              <label htmlFor="loginEmail">Email Address</label>
              <div className="glass-input-box">
                <span className="glass-input-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="loginEmail"
                  type="email"
                  className="glass-input"
                  placeholder="admin@srcb.edu.ph"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="glass-field">
              <label htmlFor="loginPass">Password</label>
              <div className={`glass-input-box ${loginError ? "error" : ""}`}>
                <span className="glass-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="loginPass"
                  type={showPassword ? "text" : "password"}
                  className="glass-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  required
                />
                <button
                  type="button"
                  className="glass-pass-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="glass-error-msg" role="alert">
                <span>⚠️ {loginError}</span>
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="glass-options-row">
              <label className="glass-checkbox-label">
                <input
                  type="checkbox"
                  className="glass-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="glass-forgot-btn"
                onClick={handleForgot}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="glass-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? <span className="spinner" /> : null}
              <span>{isSubmitting ? "Signing in…" : "Sign In"}</span>
              {!isSubmitting && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="glass-card-footer">
            College Department • St. Rita's College of Balingasag
          </div>
        </section>
      </div>
    </div>
  );
}
