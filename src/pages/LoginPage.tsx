import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, GraduationCap } from "lucide-react";
import { api } from "../data/mockApi";
import { useToast } from "../components/common/Toast";
import Logo from "../assets/images/Logo.png";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const navigate = useNavigate();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    const presetCredentials: Record<
      string,
      { email: string; password: string }
    > = {
      admin: { email: "admin@srcb.edu.ph", password: "@admin123" },
      teacher: { email: "teacher@srcb.edu.ph", password: "@teacher123" },
      student: { email: "student@srcb.edu.ph", password: "@student123" },
    };

    const selected = presetCredentials[role] ?? presetCredentials.admin;
    const loginEmail = trimmed || selected.email;
    const loginPassword = password || selected.password;

    try {
      const res: any = await api.post("/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });

      const payload = res.data || {};
      const userRole = String(payload.user?.role || role).toLowerCase();
      localStorage.setItem("token", payload.token || "");
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userName", payload.user?.name || "User");
      if (userRole === "teacher") {
        localStorage.setItem(
          "teacherId",
          String(payload.user?.teacher?.id || ""),
        );
      }
      if (userRole === "student") {
        localStorage.setItem(
          "studentProgram",
          String(payload.user?.student?.programCode || ""),
        );
        localStorage.setItem(
          "studentYear",
          String(payload.user?.student?.yearLevel || ""),
        );
        localStorage.setItem(
          "studentSection",
          String(payload.user?.student?.sectionLabel || ""),
        );
      }
      toast.push("Signed in", "success");

      const destination =
        userRole === "teacher"
          ? "/teacher-dashboard"
          : userRole === "student"
            ? "/student-dashboard"
            : "/admin-dashboard";
      navigate(destination);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Invalid email or password";
      setLoginError(msg);
      setTimeout(() => setLoginError(null), 4000);
    }
  };

  const handleForgot = async () => {
    const e = window.prompt("Enter your account email");
    if (!e) return;
    try {
      const res: any = await api.post("/auth/forgot", { email: e });
      // For dev we return token — show user a message instructing them to check their email in production.
      const token = res.data?.token;
      toast.push("Reset token generated (dev). Check console.", "info");
      // eslint-disable-next-line no-console
      console.log("Reset token (dev):", token);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Failed to request reset";
      toast.push(String(msg), "error");
    }
  };

  useEffect(() => {
    document.body.style.background =
      "linear-gradient(135deg, #003f7f 0%, #0d5499 100%)";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  return (
    <div className="login-wrapper">
      <div className="auth-shell">
        <section className="auth-intro">
          <div className="landing-hero__badge">
            <GraduationCap size={18} />
            Academic scheduling portal
          </div>
          <h2>Sign in to the St. Rita's College scheduling platform</h2>
          <p className="muted">
            Access a dependable, role-based experience for administrators,
            teachers, and students.
          </p>
        </section>
        <section className="auth-side">
          <img
            src={Logo}
            alt="St. Rita's College Logo"
            className="login-logo"
          />
          <h2>Welcome back</h2>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@srbc.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className={`input-wrapper ${loginError ? "error" : ""}`}>
                <Lock size={18} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((s) => !s)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {loginError && (
                <div className="inline-error" role="alert">
                  <span className="err-icon">!</span>
                  <span>{loginError}</span>
                </div>
              )}
            </div>

            <div className="field-group" style={{ marginBottom: 16 }}>
              <label htmlFor="role">Sign in as</label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="admin">Administrator</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="muted-link"
                onClick={handleForgot}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0d5499",
                  cursor: "pointer",
                }}
              >
                Forgot password?
              </button>
              <button type="submit" className="login-button">
                Sign In <ArrowRight size={16} />
              </button>
            </div>
          </form>

          <p className="login-footer" style={{ marginTop: 16 }}>
            College Department • Academic Scheduling System
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/register")}
            style={{ marginTop: 8 }}
          >
            Create an account
          </button>
        </section>
      </div>
    </div>
  );
}
