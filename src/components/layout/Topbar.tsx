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
  ChevronDown,
  CalendarDays,
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState, useRef, useMemo, type FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useProgramContext } from "../../contexts/ProgramContext";
import { useNotifications, type SystemNotification } from "../../contexts/NotificationContext";
import { Tooltip } from "../common/Tooltip";
import Logo from "../../assets/images/Logo.png";
import { getProgramLogo } from "../../utils/programLogos";
import { api } from "../../data/apiClient";

interface TopbarProps {
  title: string;
  onToggleMobileSidebar?: () => void;
}

interface GlobalSearchItem {
  id: string;
  category: "schedules" | "subjects" | "faculty" | "rooms" | "sections";
  categoryLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: "blue" | "green" | "purple" | "amber" | "slate";
  url: string;
  keywords: string;
}

export function Topbar({ title, onToggleMobileSidebar }: TopbarProps) {
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [allSearchItems, setAllSearchItems] = useState<GlobalSearchItem[]>([]);
  const isFetchingSearchRef = useRef(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const notifRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase();

  const isIct =
    role === "super_admin" ||
    role === "ict" ||
    role.includes("super_admin") ||
    role.includes("ict") ||
    location?.pathname === "/users" ||
    Boolean(location?.pathname?.startsWith("/users")) ||
    Boolean(title && (title.includes("ICT") || title.toLowerCase().includes("user management")));

  const isIctPage = isIct;

  const { selectedProgram, setSelectedProgramKey, programOptions } = useProgramContext();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();
  const userName =
    window.localStorage.getItem("userName") ||
    (role === "super_admin"
      ? "Super Admin (ICT)"
      : role === "program_head"
        ? "Dr. Alan Turing"
        : "Dean of Student Affairs (Admin)");

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
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadSearchItems = async () => {
    if (isFetchingSearchRef.current || allSearchItems.length > 0) return;
    isFetchingSearchRef.current = true;
    try {
      const [schedRes, subRes, facRes, rmRes, secRes] = await Promise.all([
        api.get("/schedules").catch(() => ({ data: { data: [] } })),
        api.get("/subjects").catch(() => ({ data: { data: [] } })),
        api.get("/faculty").catch(() => ({ data: { data: [] } })),
        api.get("/rooms").catch(() => ({ data: { data: [] } })),
        api.get("/sections").catch(() => ({ data: { data: [] } })),
      ]);

      const items: GlobalSearchItem[] = [];

      // 1. Schedules
      (schedRes.data?.data || []).forEach((s: any) => {
        items.push({
          id: `sched-${s.id || s.subjectCode}-${s.day}-${s.time}`,
          category: "schedules",
          categoryLabel: "Schedule",
          title: `${s.subjectCode || "Class"} - ${s.subject || "Scheduled Class"}`,
          subtitle: `${s.day || "Day"} · ${s.time || "Time"} · Room: ${s.room || "TBA"} · Sec: ${s.section || "General"} · ${s.faculty || "Faculty"}`,
          badge: s.modality || "Face-to-Face",
          badgeTone: s.modality === "Online" ? "green" : "blue",
          url: `/schedules?q=${encodeURIComponent(s.subjectCode || s.subject)}`,
          keywords: `${s.subjectCode || ""} ${s.subject || ""} ${s.faculty || ""} ${s.room || ""} ${s.section || ""} ${s.day || ""} ${s.modality || ""} ${s.building || ""}`.toLowerCase(),
        });
      });

      // 2. Subjects
      (subRes.data?.data || []).forEach((sub: any) => {
        items.push({
          id: `sub-${sub.code || sub.id}`,
          category: "subjects",
          categoryLabel: "Subject",
          title: `${sub.code} - ${sub.name}`,
          subtitle: `${sub.program || sub.department || "Curriculum"} · ${sub.units || 3} Units · ${sub.instructor || "Unassigned"}`,
          badge: sub.isMajor ? "Major" : "Gen Ed",
          badgeTone: sub.isMajor ? "purple" : "slate",
          url: `/subjects?q=${encodeURIComponent(sub.code || sub.name)}`,
          keywords: `${sub.code || ""} ${sub.name || ""} ${sub.department || ""} ${sub.program || ""} ${sub.instructor || ""}`.toLowerCase(),
        });
      });

      // 3. Faculty
      (facRes.data?.data || []).forEach((f: any) => {
        items.push({
          id: `fac-${f.id || f.name}`,
          category: "faculty",
          categoryLabel: "Faculty",
          title: f.name,
          subtitle: `${f.department || "Academic"} · ${f.status || "Faculty"} · ${f.email || ""}`,
          badge: f.status || "Faculty",
          badgeTone: "green",
          url: `/faculty?q=${encodeURIComponent(f.name)}`,
          keywords: `${f.name || ""} ${f.department || ""} ${f.email || ""} ${f.status || ""} ${f.id || ""}`.toLowerCase(),
        });
      });

      // 4. Rooms
      (rmRes.data?.data || []).forEach((r: any) => {
        items.push({
          id: `rm-${r.number}`,
          category: "rooms",
          categoryLabel: "Room",
          title: `Room ${r.number}`,
          subtitle: `${r.building || "Campus"} · ${r.type || "Classroom"} · Capacity: ${r.capacity || 40}`,
          badge: `Cap: ${r.capacity || 40}`,
          badgeTone: "slate",
          url: `/rooms?q=${encodeURIComponent(r.number)}`,
          keywords: `${r.number || ""} ${r.building || ""} ${r.type || ""}`.toLowerCase(),
        });
      });

      // 5. Sections
      (secRes.data?.data || []).forEach((sec: any) => {
        const label = sec.section || (sec.course ? `${sec.course} ${sec.yearLevel || ""}-${sec.section}`.trim() : "Section");
        items.push({
          id: `sec-${sec.id || label}`,
          category: "sections",
          categoryLabel: "Section",
          title: label,
          subtitle: `${sec.course || sec.program || "Program"} · Year ${sec.yearLevel || 1} · ${sec.students || 30} Students`,
          badge: `${sec.students || 30} Students`,
          badgeTone: "amber",
          url: `/sections?q=${encodeURIComponent(label)}`,
          keywords: `${label} ${sec.course || ""} ${sec.program || ""} Year ${sec.yearLevel || ""}`.toLowerCase(),
        });
      });

      setAllSearchItems(items);
    } catch (err) {
      console.error("Failed to load search data:", err);
    } finally {
      isFetchingSearchRef.current = false;
    }
  };

  const matchedResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const tokens = q.split(/\s+/).filter(Boolean);
    return allSearchItems
      .filter((item) => tokens.every((token) => item.keywords.includes(token)))
      .slice(0, 8);
  }, [allSearchItems, query]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || matchedResults.length === 0) {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < matchedResults.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : matchedResults.length - 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsSearchOpen(false);
    }
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;

    setIsSearchOpen(false);

    if (selectedIndex >= 0 && selectedIndex < matchedResults.length) {
      navigate(matchedResults[selectedIndex].url);
      return;
    }

    if (matchedResults.length > 0) {
      navigate(matchedResults[0].url);
      return;
    }

    const lower = q.toLowerCase();
    if (lower.includes("faculty") || lower.includes("teacher") || lower.includes("prof") || lower.includes("instructor")) {
      navigate(`/faculty?q=${encodeURIComponent(q)}`);
    } else if (lower.includes("subject") || lower.includes("curriculum")) {
      navigate(`/subjects?q=${encodeURIComponent(q)}`);
    } else if (lower.includes("room") || lower.includes("lab") || lower.includes("facility")) {
      navigate(`/rooms?q=${encodeURIComponent(q)}`);
    } else if (lower.includes("section") || lower.includes("cohort")) {
      navigate(`/sections?q=${encodeURIComponent(q)}`);
    } else if (lower.includes("exam")) {
      navigate(`/exams?q=${encodeURIComponent(q)}`);
    } else {
      navigate(`/schedules?q=${encodeURIComponent(q)}`);
    }
  };

  const getCategoryIcon = (category: GlobalSearchItem["category"]) => {
    switch (category) {
      case "schedules":
        return <CalendarDays size={16} />;
      case "subjects":
        return <BookOpen size={16} />;
      case "faculty":
        return <Users size={16} />;
      case "rooms":
        return <Building2 size={16} />;
      case "sections":
        return <GraduationCap size={16} />;
      default:
        return <Search size={16} />;
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
              className="topbar__program-logo"
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
              {selectedProgram.shortLabel || selectedProgram.label}
            </span>
          </div>
        ) : role !== "super_admin" ? (
          <label className="topbar__program-badge" title="Active Academic Program Filter">
            <img
              src={currentProgramLogo}
              alt="Program Logo"
              className="topbar__program-logo"
            />
            <span className="topbar__program-select-wrapper">
              <select
                className="topbar__program-native-select"
                value={selectedProgram.key}
                onChange={(event) =>
                  setSelectedProgramKey(event.target.value as any)
                }
                aria-label="Filter by academic program"
              >
                {programOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.shortLabel}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="topbar__program-chevron" aria-hidden="true" />
            </span>
          </label>
        ) : null}

        {!isIctPage && (
          <div className="topbar__search-container" ref={searchContainerRef}>
          <form className="topbar__search" onSubmit={handleSearch} role="search" aria-label="Global search">
            <Search size={16} className="topbar__search-icon" />
            <input
              ref={searchInputRef}
              placeholder="Search schedules, subjects, faculty, rooms..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsSearchOpen(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => {
                loadSearchItems();
                if (query.trim().length > 0) setIsSearchOpen(true);
              }}
              onKeyDown={handleKeyDown}
              aria-label="Search across SCSMS"
            />
            {query && (
              <button
                type="button"
                className="topbar__search-clear"
                onClick={() => {
                  setQuery("");
                  setIsSearchOpen(false);
                  setSelectedIndex(-1);
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search input"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {isSearchOpen && query.trim().length > 0 && (
            <div className="topbar__search-dropdown" role="listbox" aria-label="Search results">
              <div className="topbar__search-header">
                <span>
                  {matchedResults.length > 0
                    ? `Found ${matchedResults.length} instant result${matchedResults.length === 1 ? "" : "s"}`
                    : "No matching records found"}
                </span>
                <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>Press Enter to search</span>
              </div>

              {matchedResults.length > 0 ? (
                <div className="topbar__search-results-list">
                  {matchedResults.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`topbar__search-item ${idx === selectedIndex ? "is-selected" : ""}`}
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate(item.url);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="topbar__search-item-main">
                        <div className="topbar__search-item-icon">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="topbar__search-item-info">
                          <span className="topbar__search-item-title">{item.title}</span>
                          <span className="topbar__search-item-sub">{item.subtitle}</span>
                        </div>
                      </div>
                      <div className="topbar__search-item-right">
                        {item.badge && (
                          <span className={`pill pill--${item.badgeTone || "navy"}`} style={{ fontSize: "0.66rem", padding: "1px 6px" }}>
                            {item.badge}
                          </span>
                        )}
                        <ArrowRight size={13} style={{ opacity: 0.5 }} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="topbar__search-empty">
                  No direct matches found for "<strong>{query}</strong>".
                  <div style={{ marginTop: 6, fontSize: "0.76rem" }}>
                    Press <strong>Enter</strong> to search across all institutional schedules.
                  </div>
                </div>
              )}

              <div className="topbar__search-footer">
                <button
                  type="button"
                  className="topbar__search-quick-btn"
                  onClick={() => {
                    setIsSearchOpen(false);
                    navigate(`/schedules?q=${encodeURIComponent(query.trim())}`);
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <CalendarDays size={13} />
                    <span>Search in <strong>Schedules</strong> for "{query.trim()}"</span>
                  </span>
                  <ArrowRight size={12} />
                </button>
                <button
                  type="button"
                  className="topbar__search-quick-btn"
                  onClick={() => {
                    setIsSearchOpen(false);
                    navigate(`/subjects?q=${encodeURIComponent(query.trim())}`);
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <BookOpen size={13} />
                    <span>Search in <strong>Subjects</strong> for "{query.trim()}"</span>
                  </span>
                  <ArrowRight size={12} />
                </button>
                <button
                  type="button"
                  className="topbar__search-quick-btn"
                  onClick={() => {
                    setIsSearchOpen(false);
                    navigate(`/faculty?q=${encodeURIComponent(query.trim())}`);
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={13} />
                    <span>Search in <strong>Faculty</strong> for "{query.trim()}"</span>
                  </span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
        )}

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
