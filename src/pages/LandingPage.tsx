import { ArrowRight, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/images/Logo.png";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="landing-page"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(0, 40, 80, 0.55) 40%, rgba(0, 40, 80, 0.05) 100%), url("/src/assets/images/SRCB FRONT DES.png")',
      }}
    >
      <div className="landing-shell">
        <section className="landing-hero">
          <div className="landing-hero__badge">
            <GraduationCap size={18} />
            St. Rita's College of Balingasag
          </div>
          <h1>Professional class scheduling for every academic department.</h1>
          <p>
            Coordinate faculty, rooms, subjects, and sections from a single,
            modern platform designed for a smarter school calendar.
          </p>
          <div className="landing-actions">
            <button
              className="login-button"
              type="button"
              onClick={() => navigate("/login")}
            >
              Login <ArrowRight size={16} />
            </button>
          </div>
          <div className="landing-card">
            <p className="eyebrow">Campus-ready workflow</p>
            <p>
              Built for administrators, program heads, and teachers with a
              consistent experience across every manual scheduling workflow.
            </p>
          </div>
        </section>
        <aside className="landing-panel">
          <img
            src={Logo}
            alt="St. Rita's College Logo"
            className="login-logo"
          />
          <h2>College Class Scheduling System</h2>
          <p className="muted">
            Keep academic operations organized, responsive, and easy to manage.
          </p>
          <div className="landing-card">
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <span className="pill">
                <ShieldCheck size={14} /> Secure access
              </span>
              <span className="pill">
                <Sparkles size={14} /> Uriel
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
