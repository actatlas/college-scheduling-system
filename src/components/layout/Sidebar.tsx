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
  HelpCircle,
  Clock,
  LayoutGrid,
  GraduationCap,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "../../assets/images/Logo.png";

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

const superAdminRoutes = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "User Management", icon: Users },
];

const adminRoutes = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedules", label: "Schedules", icon: CalendarDays },
  { to: "/users", label: "User Management", icon: Users },
  { to: "/programs", label: "Programs", icon: Building2 },
  { to: "/courses", label: "Courses", icon: GraduationCap },
  { to: "/faculty", label: "Faculty", icon: Users },
  { to: "/exams", label: "Exams", icon: CalendarCheck },
  { to: "/subjects", label: "Subjects Catalog", icon: BookOpen },
  { to: "/rooms", label: "Rooms & Facilities", icon: DoorOpen },
];

const programHeadRoutes = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedules", label: "Schedules", icon: CalendarDays },
  { to: "/programs", label: "Programs", icon: Building2 },
  { to: "/courses", label: "Courses", icon: GraduationCap },
  { to: "/faculty", label: "Faculty", icon: Users },
  { to: "/exams", label: "Exams", icon: CalendarCheck },
  { to: "/subjects", label: "Subjects Catalog", icon: BookOpen },
];

const teacherRoutes = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedules", label: "Schedules", icon: CalendarDays },
  { to: "/dashboard", label: "My Availability", icon: Clock },
];

export function Sidebar() {
  const navigate = useNavigate();
  const role = getRole();
  const routes =
    role === "super_admin"
      ? superAdminRoutes
      : role === "program_head"
        ? programHeadRoutes
        : role === "teacher"
          ? teacherRoutes
          : adminRoutes;

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

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar__brand">
        <img src={Logo} alt="SRCB Logo" className="sidebar__logo" />
        <div>
          <p className="sidebar__brand-name">SRCB</p>
          <p className="sidebar__brand-sub">Scheduling System</p>
        </div>
      </div>

      {/* CTA Button */}
      {role !== "teacher" && role !== "super_admin" && (
        <button
          className="sidebar__cta"
          type="button"
          onClick={() => navigate("/schedules")}
        >
          <Plus size={18} />
          <span>New Schedule</span>
        </button>
      )}

      <div className="sidebar__role-pill">
        <ShieldCheck size={15} />
        <span>{getRoleLabel(role)}</span>
      </div>

      {/* Primary Navigation */}
      <nav className="sidebar__nav" aria-label="Primary">
        {routes.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={`${to}-${label}`}
            to={to}
            end={to === "/dashboard"}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " is-active" : ""}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="sidebar__bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar__link${isActive ? " is-active" : ""}`
          }
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
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

