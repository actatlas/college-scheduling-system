import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Calendar,
  Users,
  BookOpen,
  Clock,
  GraduationCap,
} from "lucide-react";
import Logo from "../assets/images/Logo.png";
import {
  itLogo,
  baLogo,
  crimLogo,
  hmLogo,
  teLogo,
} from "../utils/programLogos";

export function LandingPage() {
  const navigate = useNavigate();

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-container">
      {/* Tech Background Grid & Glowing Orbs */}
      <div className="landing-grid-backdrop" />

      {/* ===================================================
          TOP NAVIGATION
          =================================================== */}
      <header className="landing-navbar">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-nav-brand" title="SRCB SCSMS">
            <img src={Logo} alt="St. Rita's College Logo" className="landing-nav-logo" />
            <div>
              <div className="landing-nav-title">
                <span>SRCB</span>
                <span style={{ color: "#38bdf8" }}>SCSMS</span>
              </div>
              <div className="landing-nav-sub">St. Rita's College of Balingasag</div>
            </div>
          </Link>

          <nav>
            <ul className="landing-nav-links">
              <li>
                <button
                  type="button"
                  className="landing-nav-link"
                  onClick={() => handleScrollToSection("hero")}
                  style={{ background: "none", border: "none", padding: 0 }}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="landing-nav-link"
                  onClick={() => handleScrollToSection("features")}
                  style={{ background: "none", border: "none", padding: 0 }}
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="landing-nav-link"
                  onClick={() => handleScrollToSection("programs")}
                  style={{ background: "none", border: "none", padding: 0 }}
                >
                  Programs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="landing-nav-link"
                  onClick={() => handleScrollToSection("governance")}
                  style={{ background: "none", border: "none", padding: 0 }}
                >
                  About
                </button>
              </li>
            </ul>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="landing-btn-secondary"
              onClick={() => navigate("/login")}
            >
              <span>Log In</span>
            </button>
            <button
              type="button"
              className="landing-btn-primary"
              onClick={() => navigate("/login")}
            >
              <span>Get Started</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================
          HERO SECTION
          =================================================== */}
      <main className="landing-hero-section" id="hero">
        <div className="landing-hero-grid">
          <div className="landing-hero-content">
            <div className="landing-hero-pill">
              <span className="landing-hero-pill-dot" />
              <span>Academic Year 2026–2027 • 1st Semester Active</span>
            </div>

            <h1 className="landing-hero-title">
              SRCB Class Scheduling Management System
              <span className="landing-hero-title-gradient">
                Professional class scheduling for every academic department.
              </span>
            </h1>

            <p className="landing-hero-desc">
              An intelligent institutional platform engineered for Super Admins, College Registrars,
              Program Heads, and Faculty members to seamlessly coordinate programs, faculty workloads,
              lecture &amp; lab rooms, curricula, and conflict-free class &amp; examination timetables with robust manual scheduling.
            </p>

            <div className="landing-hero-cta-group">
              <button
                type="button"
                className="landing-hero-cta-primary"
                onClick={() => navigate("/login")}
              >
                <span>Launch Portal</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className="landing-hero-cta-secondary"
                onClick={() => handleScrollToSection("features")}
              >
                <Sparkles size={16} />
                <span>Explore Features</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ===================================================
          FEATURES SECTION
          =================================================== */}
      <section className="landing-features-section" id="features">
        <div className="landing-section-header">
          <div className="landing-section-tag">
            <Sparkles size={14} />
            <span>Institutional Capabilities</span>
          </div>
          <h2 className="landing-section-title">Built for Precision Academic Operations</h2>
          <p className="landing-section-desc">
            SCSMS integrates all aspects of college scheduling into one collaborative, automated environment.
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-box">
            <div className="landing-feature-icon-box">
              <Calendar size={22} />
            </div>
            <h3>Intelligent Timetable Generation</h3>
            <p>
              Automatically maps lecture and laboratory hours across days and time slots while honoring capacity constraints.
            </p>
          </div>

          <div className="landing-feature-box">
            <div className="landing-feature-icon-box">
              <Users size={22} />
            </div>
            <h3>Faculty Load &amp; Availability</h3>
            <p>
              Prevents faculty overloads and double-bookings by verifying instructor schedules and availability windows.
            </p>
          </div>

          <div className="landing-feature-box">
            <div className="landing-feature-icon-box">
              <Clock size={22} />
            </div>
            <h3>Midterm &amp; Final Exam Matrix</h3>
            <p>
              Generates conflict-free examination timetables with designated proctor assignments and building allocations.
            </p>
          </div>

          <div className="landing-feature-box">
            <div className="landing-feature-icon-box">
              <GraduationCap size={22} />
            </div>
            <h3>Multi-Department Governance</h3>
            <p>
              Enables Program Heads to manage departmental curricula, sections, and subjects with real-time sync.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          PROGRAMS SHOWCASE
          =================================================== */}
      <section className="landing-programs-section" id="programs">
        <div className="landing-section-header">
          <div className="landing-section-tag">
            <BookOpen size={14} />
            <span>Academic Programs</span>
          </div>
          <h2 className="landing-section-title">Serving All College Departments</h2>
        </div>

        <div className="landing-programs-grid">
          <div className="landing-program-card">
            <img src={itLogo} alt="Information Technology Program" className="landing-program-img" />
            <div className="landing-program-badge">ITP</div>
            <div className="landing-program-name">Information Technology Program</div>
          </div>
          <div className="landing-program-card">
            <img src={baLogo} alt="Business Administration Program" className="landing-program-img" />
            <div className="landing-program-badge">BSA</div>
            <div className="landing-program-name">Business Administration Program</div>
          </div>
          <div className="landing-program-card">
            <img src={crimLogo} alt="Criminal Justice Education Program" className="landing-program-img" />
            <div className="landing-program-badge">CJEP</div>
            <div className="landing-program-name">Criminal Justice Education Program</div>
          </div>
          <div className="landing-program-card">
            <img src={hmLogo} alt="Hospitality Management Program" className="landing-program-img" />
            <div className="landing-program-badge">HMP</div>
            <div className="landing-program-name">Hospitality Management Program</div>
          </div>
          <div className="landing-program-card">
            <img src={teLogo} alt="Teacher Education Program" className="landing-program-img" />
            <div className="landing-program-badge">TEP</div>
            <div className="landing-program-name">Teacher Education Program</div>
          </div>
        </div>
      </section>

      {/* ===================================================
          FOOTER
          =================================================== */}
      <footer className="landing-footer" id="governance">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <img src={Logo} alt="St. Rita's College Logo" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#ffffff" }}>
                St. Rita's College of Balingasag
              </div>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                College Department • Balingasag, Misamis Oriental
              </div>
            </div>
          </div>

          <div className="landing-footer-text">
            © {new Date().getFullYear()} <strong>SRCB Class Scheduling Management System (SCSMS)</strong>. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
