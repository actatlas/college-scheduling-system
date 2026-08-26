import {
  Search,
  MoonStar,
  Sun,
  Bell,
  Menu,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCheck,
  Trash2,
  ExternalLink,
  X,
} from "lucide-react";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useProgramContext } from "../../contexts/ProgramContext";
import { useNotifications, type SystemNotification } from "../../contexts/NotificationContext";
import { Tooltip } from "../common/Tooltip";
import Logo from "../../assets/images/Logo.png";
import { getProgramLogo } from "../../utils/programLogos";

interface TopbarProps {
  title: string;
  onToggleMobileSidebar?: () => void;
}

export function Topbar({ title, onToggleMobileSidebar }: TopbarProps) {
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const notifRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { selectedProgram, setSelectedProgramKey, programOptions } = useProgramContext();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const currentProgramLogo = getProgramLogo(selectedProgram.key || selectedProgram.label);

  const filteredNotifs = notifications.filter((n) =>
    notifFilter === "all" ? true : !n.read
  );

  const getNotifIcon = (type: SystemNotification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={16} color="#10b981" />;
      case "warning":
        return <AlertTriangle size={16} color="#f59e0b" />;
      case "error":
        return <AlertCircle size={16} color="#ef4444" />;
      default:
        return <Info size={16} color="#3b82f6" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return "Just now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        {onToggleMobileSidebar && (
          <Tooltip content="Menu">
            <button
              type="button"
              className="topbar__menu-btn"
              onClick={onToggleMobileSidebar}
              aria-label="Open navigation sidebar menu"
            >
              <Menu size={20} />
            </button>
          </Tooltip>
        )}
        <Link to="/dashboard" className="topbar__logo-link" title="Return to Dashboard">
          <img src={Logo} alt="SRCB Logo" className="topbar__logo-img" />
        </Link>
        <div>
          <p className="topbar__eyebrow">Academic Logistics Platform</p>
          <h2 className="topbar__page-title">{title}</h2>
        </div>
      </div>

      <div className="topbar__actions">
        {/* Program Selector for Admin; Locked Program Scope Badge for Program Head */}
        {role === "program_head" ? (
          <div className="topbar__program-badge" title="Assigned Academic Program Scope">
            <img
              src={currentProgramLogo}
              alt="Program Logo"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "5px",
                objectFit: "contain",
              }}
            />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.01em" }}>
              {selectedProgram.shortLabel || selectedProgram.label}
            </span>
          </div>
        ) : role !== "teacher" && role !== "super_admin" ? (
          <div className="topbar__program-badge">
            <img
              src={currentProgramLogo}
              alt="Program Logo"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "5px",
                objectFit: "contain",
              }}
            />
            <label className="topbar__program-select" aria-label="Filter by academic program">
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
          </div>
        ) : null}

        <form className="topbar__search" onSubmit={handleSearch} role="search" aria-label="Global search">
          <Search size={16} />
          <input
            placeholder="Search subjects, faculty..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search subjects or faculty across SCSMS"
          />
        </form>

        {/* Real-time Notifications Popover */}
        <div className="topbar__notif-wrapper" ref={notifRef} style={{ position: "relative" }}>
          <Tooltip content="Notifications" position="bottom">
            <button
              className={`topbar__icon ${isNotifOpen ? "active" : ""}`}
              type="button"
              aria-label="System notifications"
              onClick={() => setIsNotifOpen((prev) => !prev)}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="topbar__badge" aria-label={`${unreadCount} unread notifications`}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </Tooltip>

          {isNotifOpen && (
            <div className="notif-dropdown" role="region" aria-label="Notifications popover">
              <div className="notif-dropdown__header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--srcb-navy)" }}>
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="pill pill--royal" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {unreadCount > 0 && (
                    <Tooltip content="Mark all as read" position="bottom">
                      <button
                        type="button"
                        className="notif-action-btn"
                        onClick={markAllAsRead}
                        aria-label="Mark all as read"
                      >
                        <CheckCheck size={14} />
                      </button>
                    </Tooltip>
                  )}
                  {notifications.length > 0 && (
                    <Tooltip content="Clear all notifications" position="bottom">
                      <button
                        type="button"
                        className="notif-action-btn"
                        onClick={clearAll}
                        aria-label="Clear all notifications"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Tooltip>
                  )}
                  <button
                    type="button"
                    className="notif-action-btn"
                    onClick={() => setIsNotifOpen(false)}
                    aria-label="Close notifications popover"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="notif-dropdown__tabs">
                <button
                  type="button"
                  className={`notif-tab ${notifFilter === "all" ? "active" : ""}`}
                  onClick={() => setNotifFilter("all")}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  className={`notif-tab ${notifFilter === "unread" ? "active" : ""}`}
                  onClick={() => setNotifFilter("unread")}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="notif-dropdown__list">
                {filteredNotifs.length === 0 ? (
                  <div className="notif-dropdown__empty">
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--srcb-text-muted)" }}>
                      {notifFilter === "unread" ? "No unread notifications" : "No system notifications"}
                    </p>
                  </div>
                ) : (
                  filteredNotifs.map((item) => (
                    <div
                      key={item.id}
                      className={`notif-item ${!item.read ? "unread" : ""}`}
                      onClick={() => {
                        markAsRead(item.id);
                        if (item.link) {
                          setIsNotifOpen(false);
                          navigate(item.link);
                        }
                      }}
                    >
                      <div className="notif-item__icon">{getNotifIcon(item.type)}</div>
                      <div className="notif-item__content">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                          <h5 className="notif-item__title">{item.title}</h5>
                          <span className="notif-item__time">{formatRelativeTime(item.timestamp)}</span>
                        </div>
                        <p className="notif-item__desc">{item.message}</p>
                        {item.link && (
                          <span className="notif-item__link">
                            <span>View details</span>
                            <ExternalLink size={11} />
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="notif-item__dismiss"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(item.id);
                        }}
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <Tooltip content={dark ? "Light Mode" : "Dark Mode"} position="bottom">
          <button
            className="topbar__icon"
            type="button"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            {dark ? <Sun size={17} /> : <MoonStar size={17} />}
          </button>
        </Tooltip>

        <Tooltip content="My Account & Profile" position="bottom">
          <div
            className="topbar__profile"
            onClick={() => navigate("/profile")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate("/profile");
              }
            }}
            aria-label="User account and profile settings"
          >
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
        </Tooltip>
      </div>
    </header>
  );
}
