import {
  LayoutDashboard,
  Building2,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  Users,
  Settings,
  LogOut,
  DoorOpen,
  ShieldCheck,
  Plus,
  Clock,
  GraduationCap,
  AlertTriangle,
  FileBarChart,
  UserCircle,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "../../assets/images/Logo.png";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  end?: boolean;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

function getRole() {
  return (window.localStorage.getItem("userRole") || "admin").toLowerCase();
}

function getRoleLabel(role: string) {
  switch (role) {
    case "super_admin":
      return "Super Admin (ICT)";
    case "admin":
      return "College Administrator";
    case "program_head":
      return "Program Head";
    case "teacher":
      return "Faculty Member";
    default:
      return "Staff Portal";
  }
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const role = getRole();
  const teacherStatus = window.localStorage.getItem("teacherStatus") || "";

  // Administrator IA (Programs -> Courses -> Subjects -> Sections -> Faculty -> Rooms -> Schedules -> Exams)
  const adminGroups: NavGroup[] = [
    {
      groupTitle: "Overview",
      items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true }],
    },
    {
      groupTitle: "Academic Catalog",
      items: [
        { to: "/programs", label: "Programs", icon: Building2 },
        { to: "/courses", label: "Courses", icon: GraduationCap },
        { to: "/subjects", label: "Subjects Catalog", icon: BookOpen },
        { to: "/sections", label: "Class Sections", icon: GraduationCap },
      ],
    },
    {
      groupTitle: "Timetable & Facilities",
      items: [
        { to: "/schedules", label: "Class Schedules", icon: CalendarDays },
        { to: "/exams", label: "Exam Schedules", icon: CalendarCheck },
        { to: "/rooms", label: "Rooms & Facilities", icon: DoorOpen },
        { to: "/conflicts", label: "Conflict Diagnostics", icon: AlertTriangle },
      ],
    },
    {
      groupTitle: "Faculty Governance",
      items: [{ to: "/faculty", label: "Faculty Directory", icon: Users }],
    },
    {
      groupTitle: "Administration",
      items: [
        { to: "/reports", label: "Reports & Analytics", icon: FileBarChart },
        { to: "/settings", label: "System Preferences", icon: Settings },
        { to: "/profile", label: "My Account", icon: UserCircle },
      ],
    },
  ];

  // Program Head IA (Major Curriculum -> Sections -> Timetable -> Instructors -> My Account)
  const programHeadGroups: NavGroup[] = [
    {
      groupTitle: "Overview",
      items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true }],
    },
    {
      groupTitle: "Curriculum & Cohorts",
      items: [
        { to: "/subjects", label: "Program Subjects", icon: BookOpen },
        { to: "/sections", label: "Class Sections", icon: GraduationCap },
      ],
    },
    {
      groupTitle: "Timetable & Facilities",
      items: [
        { to: "/schedules", label: "Class Schedules", icon: CalendarDays },
        { to: "/exams", label: "Exam Schedules", icon: CalendarCheck },
        { to: "/rooms", label: "Campus Facilities", icon: DoorOpen },
        { to: "/conflicts", label: "Conflict Diagnostics", icon: AlertTriangle },
      ],
    },
    {
      groupTitle: "Faculty Management",
      items: [{ to: "/faculty", label: "Major Instructors", icon: Users }],
    },
    {
      groupTitle: "Account",
      items: [{ to: "/profile", label: "My Account", icon: UserCircle }],
    },
  ];

  // Super Admin IA (ICT Governance & System Security)
  const superAdminGroups: NavGroup[] = [
    {
      groupTitle: "Overview",
      items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true }],
    },
    {
      groupTitle: "ICT & User Governance",
      items: [
        { to: "/users", label: "User Accounts", icon: Users },
      ],
    },
    {
      groupTitle: "Account",
      items: [{ to: "/profile", label: "My Account", icon: UserCircle }],
    },
  ];

  // Faculty Member / Teacher IA
  const teacherGroups: NavGroup[] = [
    {
      groupTitle: "Overview",
      items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true }],
    },
    {
      groupTitle: "My Academic Timetable",
      items: [
        { to: "/schedules", label: "Class Schedules", icon: CalendarDays },
        { to: "/exams", label: "Assigned Exam Duties", icon: CalendarCheck },
        ...(teacherStatus === "Part-Time"
          ? [{ to: "/dashboard", label: "Weekly Availability", icon: Clock }]
          : []),
      ],
    },
    {
      groupTitle: "Account",
      items: [{ to: "/profile", label: "My Account", icon: UserCircle }],
    },
  ];

  const navGroups: NavGroup[] =
    role === "super_admin"
      ? superAdminGroups
      : role === "program_head"
        ? programHeadGroups
        : role === "teacher"
          ? teacherGroups
          : adminGroups;

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userName");
      localStorage.removeItem("teacherId");
      localStorage.removeItem("teacherStatus");
      localStorage.removeItem("selectedProgram");
    } finally {
      navigate("/login");
    }
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? "sidebar--mobile-open" : ""}`} aria-label="Main Navigation">
      {/* Brand Header */}
      <div className="sidebar__brand">
        <NavLink
          to="/dashboard"
          className="sidebar__brand-link"
          onClick={handleNavClick}
          title="Return to Dashboard"
        >
          <img src={Logo} alt="SRCB Logo" className="sidebar__logo" />
          <div className="sidebar__brand-text">
            <p className="sidebar__brand-name">SRCB</p>
            <p className="sidebar__brand-sub">Scheduling System</p>
          </div>
        </NavLink>
        {onClose && (
          <button
            type="button"
            className="sidebar__close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Quick Action CTA Button */}
      {role !== "teacher" && role !== "super_admin" && (
        <button
          className="sidebar__cta"
          type="button"
          onClick={() => {
            navigate("/schedules");
            if (onClose) onClose();
          }}
        >
          <Plus size={18} />
          <span>New Schedule</span>
        </button>
      )}

      {/* Role Indicator Badge */}
      <div className="sidebar__role-pill">
        <ShieldCheck size={15} />
        <span>{getRoleLabel(role)}</span>
      </div>

      {/* Grouped Information Architecture Navigation */}
      <nav className="sidebar__nav" aria-label="Primary">
        {navGroups.map((group) => (
          <div key={group.groupTitle} className="sidebar__group">
            <p className="sidebar__group-title">{group.groupTitle}</p>
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={`${to}-${label}`}
                to={to}
                end={end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `sidebar__link${isActive ? " is-active" : ""}`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="sidebar__bottom">
        <button
          className="sidebar__logout"
          type="button"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

