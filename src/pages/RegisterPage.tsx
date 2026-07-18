import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, GraduationCap, Mail, Lock, UserRound } from "lucide-react";
import Logo from "../assets/images/Logo.png";
import { useToast } from "../components/common/Toast";
import { api } from "../data/mockApi";

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState<"student" | "teacher">("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    programCode: "",
    yearLevel: "1",
  });
  const [courseOptions, setCourseOptions] = useState<
    Array<{ code: string; name: string }>
  >([]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.post("/auth/register", {
        ...form,
        role: mode,
        programCode: mode === "student" ? form.programCode : undefined,
        yearLevel: mode === "student" ? form.yearLevel : undefined,
      });

      const loginRes: any = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });

      const payload = loginRes.data || {};
      const userRole = String(payload.user?.role || mode).toLowerCase();
      localStorage.setItem("token", payload.token || "");
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userName", payload.user?.name || form.name);

      toast.push("Account created and signed in", "success");
      const destination =
        userRole === "teacher"
          ? "/teacher-dashboard"
          : userRole === "student"
            ? "/student-dashboard"
            : "/admin-dashboard";
      navigate(destination);
    } catch (error: any) {
      toast.push(
        error?.response?.data?.error || "Unable to create account",
        "error",
      );
    }
  };

  useEffect(() => {
    api
      .get("/courses")
      .then((res: any) => setCourseOptions(res.data?.data || []))
      .catch(() => setCourseOptions([]));
  }, []);

  return (
    <div className="landing-page">
      <div className="auth-shell">
        <section className="auth-intro">
          <div className="landing-hero__badge">
            <GraduationCap size={18} />
            Create your account
          </div>
          <h2>Join the St. Rita's College scheduling portal</h2>
          <p className="muted">
            Choose whether you are registering as a student or a teacher and
            continue with the same polished experience.
          </p>
        </section>
        <section className="auth-side">
          <img
            src={Logo}
            alt="St. Rita's College Logo"
            className="login-logo"
          />
          <h2>Register</h2>
          <div
            className="auth-switcher"
            role="tablist"
            aria-label="Registration type"
          >
            <button
              type="button"
              className={mode === "student" ? "active" : ""}
              onClick={() => setMode("student")}
            >
              Student
            </button>
            <button
              type="button"
              className={mode === "teacher" ? "active" : ""}
              onClick={() => setMode("teacher")}
            >
              Teacher
            </button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="name">Full name</label>
              <div className="input-wrapper">
                <UserRound size={18} />
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Juan Dela Cruz"
                  required
                />
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="role">Registration type</label>
              <select
                id="role"
                value={mode}
                onChange={(event) => {
                  const nextMode = event.target.value as "student" | "teacher";
                  setMode(nextMode);
                  setForm({ ...form, role: nextMode });
                }}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="name@srcb.edu.ph"
                  required
                />
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  placeholder="Create a password"
                  required
                />
              </div>
            </div>
            {mode === "student" ? (
              <>
                <div className="field-group">
                  <label htmlFor="programCode">Program</label>
                  <select
                    id="programCode"
                    value={form.programCode}
                    onChange={(event) =>
                      setForm({ ...form, programCode: event.target.value })
                    }
                    required
                  >
                    <option value="">Select your program</option>
                    {courseOptions.map((course) => (
                      <option key={course.code} value={course.code}>
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="yearLevel">Year level</label>
                  <select
                    id="yearLevel"
                    value={form.yearLevel}
                    onChange={(event) =>
                      setForm({ ...form, yearLevel: event.target.value })
                    }
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                </div>
              </>
            ) : null}
            {mode === "student" ? (
              <>
                <div className="field-group">
                  <label htmlFor="programCode">Program</label>
                  <select
                    id="programCode"
                    value={form.programCode}
                    onChange={(event) =>
                      setForm({ ...form, programCode: event.target.value })
                    }
                    required
                  >
                    <option value="">Select your program</option>
                    {courseOptions.map((course) => (
                      <option key={course.code} value={course.code}>
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label htmlFor="yearLevel">Year level</label>
                  <select
                    id="yearLevel"
                    value={form.yearLevel}
                    onChange={(event) =>
                      setForm({ ...form, yearLevel: event.target.value })
                    }
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                </div>
              </>
            ) : null}
            <button className="login-button" type="submit">
              {mode === "teacher"
                ? "Create teacher account"
                : "Create student account"}{" "}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="muted" style={{ marginTop: 12 }}>
            Already have an account?{" "}
            <button
              type="button"
              className="muted-link"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </p>
        </section>
      </div>
    </div>
  );
}
