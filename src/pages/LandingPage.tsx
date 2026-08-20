import { ArrowRight, GraduationCap, ShieldCheck, Sparkles, Calendar, Users, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/images/Logo.png";
import FrontDeskBg from "../assets/images/SRCB FRONT DES.png";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="landing-wrapper"
      style={{
        backgroundImage: `url("${FrontDeskBg}")`,
      }}
    >
      {/* Background Dimmer Overlay — same as login */}
      <div className="landing-bg-overlay" />

      {/* Subtle Logo Watermark — same as login */}
      <div
        className="landing-bg-watermark"
        style={{
          backgroundImage: `url("${Logo}")`,
        }}
      />

      {/* Top Breadcrumb Tag — same as login */}
      <div className="landing-page-tag">
        <GraduationCap size={16} />
        <span>St. Rita's College of Balingasag</span>
      </div>

      <div className="glass-landing-shell">
        {/* Left Hero Section */}
        <section className="glass-landing-hero">
          <div className="glass-brand-badge">
            <img src={Logo} alt="St. Rita's College Logo" className="glass-logo" />
            <div>
              <div className="glass-brand-title">St. Rita's College</div>
              <div className="glass-brand-sub">Balingasag, Misamis Oriental</div>
            </div>
          </div>

          <h1>Professional class scheduling for every academic department.</h1>
          <p className="hero-desc">
            Coordinate faculty, rooms, subjects, and sections from a single,
            modern platform designed for a smarter school calendar.
          </p>

          <div className="glass-landing-features">
            <div className="glass-landing-features-title">
              <Sparkles size={14} />
              <span>Platform Highlights</span>
            </div>
            <div className="glass-feature-grid">
              <div className="glass-feature-item">
                <Calendar size={18} />
                <div>
                  <strong>Smart Scheduling</strong>
                  <span>Automated conflict detection &amp; resolution</span>
                </div>
              </div>
              <div className="glass-feature-item">
                <Users size={18} />
                <div>
                  <strong>Faculty Management</strong>
                  <span>Track loads, availability &amp; assignments</span>
                </div>
              </div>
              <div className="glass-feature-item">
                <BookOpen size={18} />
                <div>
                  <strong>Academic Programs</strong>
                  <span>Manage curricula, sections &amp; subjects</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Frosted Glass Card — mirrors the login card style */}
        <section className="glass-landing-card">
          <div className="glass-landing-card-header">
            <h2>College Class Scheduling System</h2>
            <p>
              Built for administrators, program heads, and teachers with a
              consistent experience across every scheduling workflow.
            </p>
          </div>

          <div className="glass-landing-pills">
            <span className="glass-pill">
              <ShieldCheck size={14} /> Secure access
            </span>

            <span className="glass-pill">
              <Calendar size={14} /> Class &amp; Exams
            </span>
          </div>

          <p className="glass-landing-card-desc">
            Keep academic operations organized, responsive, and easy to manage
            — all from one centralized scheduling portal.
          </p>

          <button
            className="glass-submit-btn"
            type="button"
            onClick={() => navigate("/login")}
          >
            <span>Get Started</span>
            <ArrowRight size={17} />
          </button>

          <div className="glass-card-footer">
            College Department • St. Rita's College of Balingasag
          </div>
        </section>
      </div>
    </div>
  );
}
