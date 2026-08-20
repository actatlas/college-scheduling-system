import {
  LayoutDashboard,
  Building2,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  AlertTriangle,
  BarChart3,
  Users,
  Settings,
  LogOut,
  DoorOpen,
  ClipboardList,
  ShieldCheck,
  GraduationCap,
  Clock,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "../../assets/images/Logo.png";

function getRole() {
  return (window.localStorage.getItem("userRole") || "admin").toLowerCase();
}

function getRoleLabel(role: string) {
  switch (role) {
    case "super_admin":
      return "Super Admin (ICT Office)";
    case "admin":
      return "College Administrator";
    case "program_head":
      return "Program Head";
    case "teacher":
      return "Faculty / Teacher";
    default:
      return "Staff Portal";
  }
}

const superAdminRoutes = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "User Management (ICT)", icon: Users },
];

const adminRoutes = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedules", label: "Class Schedules", icon: CalendarDays },
  { to: "/exams", label: "Exam Schedules", icon: CalendarCheck },
  { to: "/faculty", label: "Faculty & Availability", icon: Users },
  { to: "/courses", label: "Programs & Courses", icon: Building2 },
  { to: "/subjects", label: "Subjects Catalog", icon: BookOpen },
  { to: "/rooms", label: "Rooms & Buildings", icon: DoorOpen },
];

const programHeadRoutes = [
  { to: "/dashboard", label: "Program Dashboard", icon: LayoutDashboard },
  { to: "/schedules", label: "Schedule Major Subjects", icon: CalendarDays },
  { to: "/exams", label: "Exam Schedules", icon: CalendarCheck },
  { to: "/subjects", label: "Program Subjects", icon: BookOpen },
  { to: "/faculty", label: "Program Faculty", icon: Users },
  { to: "/rooms", label: "Rooms & Buildings", icon: DoorOpen },
];

const teacherRoutes = [
  { to: "/dashboard", label: "Teacher Dashboard", icon: LayoutDashboard },
  { to: "/schedules", label: "My Class Schedule", icon: CalendarDays },
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
          <p className="sidebar__brand-sub">Scheduling Platform</p>
        </div>
      </div>

      <div className="sidebar__role-pill">
        <ShieldCheck size={16} />
        <span>{getRoleLabel(role)}</span>
      </div>

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

      <button className="sidebar__logout" type="button" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </aside>
  );
}
