import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { Save, School, Sliders, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "../components/common/Toast";

export function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState({
    institutionName: "St. Rita's College of Balingasag",
    institutionCode: "SRCB",
    academicYear: "2026-2027",
    semester: "1st Semester",
    standardClassDuration: "90",
    defaultModality: "Face-to-Face",
    allowSaturdayClasses: true,
    enforceAvailabilityStrict: true,
    maxFullTimeLoadHours: 24,
    maxPartTimeLoadHours: 12,
  });

  useEffect(() => {
    const saved = localStorage.getItem("srcb_system_settings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch {
        // use defaults
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("srcb_system_settings", JSON.stringify(settings));
    toast.push("Institutional settings and scheduling rules saved successfully", "success");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Settings & System Preferences"
        description="Configure institutional parameters, active academic term, default timetable rules, and workload constraints."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Settings</strong>
          </>
        }
        actions={
          <button className="action-button" type="button" onClick={handleSave}>
            <Save size={16} />
            Save Changes
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* Institution Profile Card */}
        <article className="card">
          <div className="card__header">
            <div>
              <p className="eyebrow">Institutional Profile</p>
              <h3>Campus & Academic Term</h3>
              <p className="muted">
                Official institution identification, active school year, and academic term.
              </p>
            </div>
            <School size={20} color="var(--srcb-navy)" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
            <div className="field-group">
              <label htmlFor="instName">Institution Name</label>
              <input
                id="instName"
                value={settings.institutionName}
                onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field-group">
                <label htmlFor="instCode">Institution Code</label>
                <input
                  id="instCode"
                  value={settings.institutionCode}
                  onChange={(e) => setSettings({ ...settings, institutionCode: e.target.value })}
                />
              </div>
              <div className="field-group">
                <label htmlFor="acadYear">Academic Year</label>
                <input
                  id="acadYear"
                  value={settings.academicYear}
                  onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="acadSem">Active Semester</label>
              <select
                id="acadSem"
                value={settings.semester}
                onChange={(e) => setSettings({ ...settings, semester: e.target.value })}
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer Term">Summer Term</option>
              </select>
            </div>
          </div>
        </article>

        {/* Scheduling Rules & Constraints */}
        <article className="card">
          <div className="card__header">
            <div>
              <p className="eyebrow">Scheduling Engine</p>
              <h3>Timetable & Workload Constraints</h3>
              <p className="muted">
                Automation parameters, teaching load limits, and availability enforcement.
              </p>
            </div>
            <Sliders size={20} color="var(--srcb-navy)" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field-group">
                <label htmlFor="fullTimeMax">Full-Time Max Hours/Wk</label>
                <input
                  id="fullTimeMax"
                  type="number"
                  value={settings.maxFullTimeLoadHours}
                  onChange={(e) => setSettings({ ...settings, maxFullTimeLoadHours: Number(e.target.value) || 24 })}
                />
              </div>
              <div className="field-group">
                <label htmlFor="partTimeMax">Part-Time Max Hours/Wk</label>
                <input
                  id="partTimeMax"
                  type="number"
                  value={settings.maxPartTimeLoadHours}
                  onChange={(e) => setSettings({ ...settings, maxPartTimeLoadHours: Number(e.target.value) || 12 })}
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="defModality">Default Class Modality</label>
              <select
                id="defModality"
                value={settings.defaultModality}
                onChange={(e) => setSettings({ ...settings, defaultModality: e.target.value })}
              >
                <option value="Face-to-Face">Face-to-Face (On-Campus)</option>
                <option value="Online">Online / Hybrid</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", cursor: "pointer", color: "var(--srcb-text)" }}>
                <input
                  type="checkbox"
                  checked={settings.allowSaturdayClasses}
                  onChange={(e) => setSettings({ ...settings, allowSaturdayClasses: e.target.checked })}
                />
                <span>Allow Saturday classes for Part-Time instructors & Weekend courses</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", cursor: "pointer", color: "var(--srcb-text)" }}>
                <input
                  type="checkbox"
                  checked={settings.enforceAvailabilityStrict}
                  onChange={(e) => setSettings({ ...settings, enforceAvailabilityStrict: e.target.checked })}
                />
                <span>Strictly enforce instructor availability during auto-generation</span>
              </label>
            </div>
          </div>
        </article>

        {/* System Integrity & Safety Notice */}
        <article className="card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={20} color="#10b981" />
            <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--srcb-text)" }}>
              Institutional Database & Conflict Safety
            </h4>
          </div>
          <p className="muted" style={{ fontSize: "0.84rem", margin: "8px 0 0" }}>
            All scheduling actions undergo real-time validation against the centralized MySQL database. Room capacity, teacher double-booking, section overlaps, room type matching (Lecture vs Laboratory), and Part-Time/Full-Time availability are verified before committing any timetable entry.
          </p>
        </article>
      </div>
    </motion.div>
  );
}
