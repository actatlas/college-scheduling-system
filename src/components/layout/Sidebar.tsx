import {
  LayoutDashboard,
  Building2,
  BookOpen,
  CalendarDays,
  AlertTriangle,
  BarChart3,
  Users,
  Settings,
  LogOut,
  DoorOpen,
  ClipboardList,
  UserCircle2,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "../../assets/images/Logo.png";

function getRole() {
  return (window.localStorage.getItem("userRole") || "admin").toLowerCase();
}

const adminRoutes = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/faculty", label: "Teachers", icon: Users },
  { to: "/courses", label: "Programs / Courses", icon: Building2 },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/sections", label: "Sections", icon: ClipboardList },
  { to: "/rooms", label: "Rooms", icon: DoorOpen },
  { to: "/schedules", label: "Schedules", icon: CalendarDays },
  { to: "/conflicts", label: "Conflict Detection", icon: AlertTriangle },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/users", label: "User Management", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

const programHeadRoutes = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/programs", label: "Programs", icon: Building2 },
  { to: "/subjects", label: "Manage Subjects", icon: BookOpen },
  { to: "/sections", label: "Manage Sections", icon: ClipboardList },
  { to: "/faculty", label: "Teachers", icon: Users },
  { to: "/rooms", label: "Rooms", icon: DoorOpen },
  { to: "/schedules", label: "Schedules", icon: CalendarDays },
];

const teacherRoutes = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedules", label: "My Schedule", icon: CalendarDays },
  { to: "/dashboard", label: "My Availability", icon: ClipboardList },
];

export function Sidebar() {
  const navigate = useNavigate();
  const role = getRole();
  const routes =
    role === "teacher"
      ? teacherRoutes
      : role === "program_head"
        ? programHeadRoutes
        : adminRoutes;
  const handleLogout = () => {
    try {
      localStorage.clear();
    } finally {
      navigate("/login");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img
          src={Logo}
          alt="St. Rita's College Logo"
          className="sidebar__logo"
        />
        <div>
          <p className="sidebar__brand-name">St. Rita's College</p>
          <p className="sidebar__brand-sub">
            {role === "teacher"
              ? "Teacher Portal"
              : role === "program_head"
                ? "Program Head Portal"
                : "Academic Scheduling"}
          </p>
        </div>
      </div>

      <div className="sidebar__role-pill">
        <UserCircle2 size={16} />
        <span>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        {routes.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " is-active" : ""}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button className="sidebar__logout" type="button" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </aside>
  );
}
