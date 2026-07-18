import { Bell, Search, MoonStar } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useProgramContext } from "../../contexts/ProgramContext";

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { selectedProgram, setSelectedProgramKey, programOptions } =
    useProgramContext();
  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase();
  const userName =
    window.localStorage.getItem("userName") ||
    (role === "teacher"
      ? "Ms. Santos"
      : role === "student"
        ? "Student"
        : "Admin");

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
    } else if (value.includes("schedule") || value.includes("timetable")) {
      navigate("/schedules");
    } else {
      navigate("/reports");
    }
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Current page</p>
        <h2>{title}</h2>
      </div>

      <div className="topbar__actions">
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
        <form className="topbar__search" onSubmit={handleSearch}>
          <Search size={16} />
          <input
            placeholder="Search faculty, programs, schedules..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <button
          className="topbar__icon"
          type="button"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
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
            {role === "teacher" ? "TE" : role === "student" ? "ST" : "AD"}
          </div>
          <div>
            <p className="topbar__name">{userName}</p>
            <p className="topbar__meta">
              {role === "teacher"
                ? "Teacher Portal"
                : role === "student"
                  ? "Student Portal"
                  : "Semester 1 · SY 2026-2027"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
