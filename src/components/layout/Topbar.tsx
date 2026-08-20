import { Search, MoonStar } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useProgramContext } from "../../contexts/ProgramContext";
import { useToast } from "../common/Toast";

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const toast = useToast();
  const { selectedProgram, setSelectedProgramKey, programOptions } =
    useProgramContext();

  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase();
  const userName =
    window.localStorage.getItem("userName") ||
    (role === "super_admin"
      ? "Super Admin (ICT)"
      : role === "program_head"
        ? "Dr. Alan Turing (IT Head)"
        : role === "teacher"
          ? "Mr. Juan Dela Cruz"
          : "Registrar Admin");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" ? true : saved === "light" ? false : false;
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleRoleSwitch = (newRole: string) => {
    localStorage.setItem("userRole", newRole);
    if (newRole === "super_admin") {
      localStorage.setItem("userName", "Engr. Super Admin (ICT)");
      localStorage.removeItem("teacherId");
    } else if (newRole === "admin") {
      localStorage.setItem("userName", "Registrar Admin");
      localStorage.removeItem("teacherId");
    } else if (newRole === "program_head") {
      localStorage.setItem("userName", "Dr. Alan Turing (IT Head)");
      localStorage.setItem("selectedProgram", "BSIT");
      localStorage.removeItem("teacherId");
    } else if (newRole === "teacher_fulltime") {
      localStorage.setItem("userRole", "teacher");
      localStorage.setItem("userName", "Mr. Juan Dela Cruz");
      localStorage.setItem("teacherId", "FAC-001");
      localStorage.setItem("teacherStatus", "Full-Time");
    } else if (newRole === "teacher_parttime") {
      localStorage.setItem("userRole", "teacher");
      localStorage.setItem("userName", "Engr. Roberto Santos (Part-Time)");
      localStorage.setItem("teacherId", "FAC-002");
      localStorage.setItem("teacherStatus", "Part-Time");
    }
    toast.push(`Switched role to: ${newRole.replace("_", " ").toUpperCase()}`, "info");
    navigate("/dashboard");
    window.location.reload();
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim().toLowerCase();
    if (!value) return;
    if (value.includes("faculty") || value.includes("teacher")) {
      navigate("/faculty");
    } else if (value.includes("program") || value.includes("course")) {
      navigate("/programs");
    } else if (value.includes("subject")) {
      navigate("/subjects");
    } else if (value.includes("section")) {
      navigate("/sections");
    } else if (value.includes("room")) {
      navigate("/rooms");
    } else if (value.includes("exam")) {
      navigate("/exams");
    } else if (value.includes("schedule") || value.includes("timetable")) {
      navigate("/schedules");
    } else {
      navigate("/reports");
    }
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Academic Platform</p>
        <h2>{title}</h2>
      </div>

      <div className="topbar__actions">
        {/* Quick Role Switcher */}
        <label className="topbar__program-select" title="Switch view role for demo/testing">
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginRight: 4 }}>
            Role:
          </span>
          <select
            value={
              role === "teacher" && localStorage.getItem("teacherStatus") === "Part-Time"
                ? "teacher_parttime"
                : role === "teacher"
                  ? "teacher_fulltime"
                  : role
            }
            onChange={(e) => handleRoleSwitch(e.target.value)}
            style={{ fontWeight: 600 }}
          >
            <option value="super_admin">⚡ Super Admin (ICT)</option>
            <option value="admin">🏛️ Admin (Registrar)</option>
            <option value="program_head">🎓 Program Head (IT)</option>
            <option value="teacher_fulltime">👨‍🏫 Teacher (Full-Time)</option>
            <option value="teacher_parttime">⏱️ Teacher (Part-Time)</option>
          </select>
        </label>

        {/* Program Selector */}
        {role !== "teacher" && (
          <label className="topbar__program-select" aria-label="Select program">
            <select
              value={selectedProgram.key}
              onChange={(event) =>
                setSelectedProgramKey(event.target.value as any)
              }
            >
              {programOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.shortLabel}
                </option>
              ))}
            </select>
          </label>
        )}

        <form className="topbar__search" onSubmit={handleSearch}>
          <Search size={16} />
          <input
            placeholder="Search faculty, rooms, exams..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>

        <button
          className="topbar__icon"
          type="button"
          aria-label="Theme toggle"
          onClick={toggleTheme}
        >
          <MoonStar size={18} />
        </button>

        <div className="topbar__profile">
          <div className="topbar__avatar">
            {role === "super_admin"
              ? "ICT"
              : role === "program_head"
                ? "PH"
                : role === "teacher"
                  ? "TE"
                  : "AD"}
          </div>
          <div>
            <p className="topbar__name">{userName}</p>
            <p className="topbar__meta">1st Sem · SY 2026-2027</p>
          </div>
        </div>
      </div>
    </header>
  );
}
