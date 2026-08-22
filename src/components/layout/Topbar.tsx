import { Search, MoonStar, Bell, HelpCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useProgramContext } from "../../contexts/ProgramContext";
import { useToast } from "../common/Toast";

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
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
      <div className="topbar__left">
        <div>
          <p className="topbar__eyebrow">Academic Logistics</p>
          <h2 className="topbar__page-title">{title}</h2>
        </div>
      </div>

      <div className="topbar__actions">
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
            placeholder="Search subjects, faculty..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>

        <button
          className="topbar__icon"
          type="button"
          aria-label="Notifications"
          onClick={() => toast.push("No new system notifications", "info")}
          title="Notifications"
        >
          <Bell size={17} />
        </button>

        <button
          className="topbar__icon"
          type="button"
          aria-label="Theme toggle"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          <MoonStar size={17} />
        </button>

        <div className="topbar__profile" onClick={() => navigate("/settings")}>
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
            <p className="topbar__meta">SY 2026-2027</p>
          </div>
        </div>
      </div>
    </header>
  );
}

